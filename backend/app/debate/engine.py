"""副脑辩论引擎 — async generator of Events, consumed by the SSE endpoint.

Loop shape:

    seed  -> 类比检索 -> 角色绑定 -> 主持人拟辩题
    round -> proposer -> analogist -> skeptic -> pragmatist
             (each: bounded context -> LLM -> schema check -> novelty check
              -> retry once -> persist -> emit)
          -> moderator compacts blackboard
          -> stop if converged | budget spent | max_rounds
    end   -> moderator writes 1-3 cards from the board (no new ideas allowed)

Every stop condition is mechanical. Nothing here waits on a human.
"""
from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator

import numpy as np

from ..db import find, get, insert, nid, now, update_id
from ..models import Blackboard, DebateConfig, Event, Role, Skeleton
from ..providers import get_moderator, get_provider
from ..retrieval.analogy import analogical_search
from ..retrieval.skeleton import skeleton_query
from ..ingest.pipeline import embed_texts
from . import blackboard as bbmod
from . import prompts
from .cards import build_cards
from .roles import ROLE_ORDER, ROLES, assign_brains

log = logging.getLogger("weave.debate")

BANNED = ("我同意", "很好的观点", "总的来说", "综上所述", "作为一个AI", "作为一名AI")


class Agent:
    """One 副脑 wearing one role. Owns its private fragments and its own notes."""

    def __init__(self, role: Role, brain: dict | None):
        self.role = role
        self.brain = brain
        self.brain_id = brain["id"] if brain else None
        self.brain_name = brain["name"] if brain else None
        self.provider = get_provider(brain.get("provider") if brain else None)
        self.fragments: list[tuple[str, str]] = []   # [(F1, text)]
        self.frag_ids: dict[str, str] = {}           # F1 -> chunk_id
        self.notes: str = ""

    def load_fragments(self, qvec: np.ndarray, wildness: float, k: int = 4) -> None:
        if not self.brain_id:
            return
        hits = analogical_search(qvec, wildness=wildness, k=k, min_brains=1,
                                 only_brain=self.brain_id)
        self.fragments = [(f"F{i+1}", h.text) for i, h in enumerate(hits)]
        self.frag_ids = {f"F{i+1}": h.chunk_id for i, h in enumerate(hits)}


def _valid(payload: dict, role: Role) -> str:
    """Returns '' if the turn is acceptable, else the reason it is not."""
    if not payload.get("body"):
        return "没有输出 body"
    body = str(payload["body"])
    if len(body) > 400:
        return "发言太长"
    for b in BANNED:
        if b in body:
            return f"使用了空转句式「{b}」"
    stance = payload.get("stance")
    if stance not in ("support", "attack", "reframe"):
        return "stance 不合法"
    if role == "skeptic" and stance != "attack":
        return "怀疑者必须 attack"
    if role in ("proposer",) and not payload.get("citations"):
        return "提案者必须引用自己副脑的碎片"
    return ""


async def run_debate(debate_id: str) -> AsyncIterator[Event]:
    row = get("debates", debate_id)
    if not row:
        yield Event(type="error", data={"message": "debate not found"})
        return
    cfg = DebateConfig(**(row.get("config") or {}))
    bb = Blackboard(**row["blackboard"]) if row.get("blackboard") else Blackboard()

    # ---------------------------------------------------------------- seed
    idea = get("ideas", row.get("idea_id"))
    seed_text = idea["text"] if idea else (row.get("motion") or "")
    sk = Skeleton(**idea["skeleton"]) if idea and idea.get("skeleton") else Skeleton()
    qvec = (await embed_texts([skeleton_query(sk, seed_text)]))[0]

    hits = analogical_search(qvec, wildness=cfg.wildness, k=10, min_brains=cfg.min_brains)
    if not hits:
        yield Event(type="error", data={"message": "副脑里没有可用碎片，先导入笔记"})
        return

    binding = assign_brains(hits, qvec)
    agents: dict[Role, Agent] = {}
    for r in ROLE_ORDER:
        b = get("brains", binding.get(r))
        a = Agent(r, b)
        a.load_fragments(qvec, cfg.wildness)
        agents[r] = a

    # ------------------------------------------------------------- motion
    mod = get_moderator()
    if not bb.motion:
        bb.motion = row.get("motion") or ""
    if not bb.motion:
        try:
            res = await mod.chat(prompts.MOTION_SYSTEM,
                                 prompts.motion_user(seed_text, sk, hits),
                                 max_tokens=220, temperature=0.7, json_mode=True)
            bb.motion = (res.json().get("motion") or "").strip()
        except Exception:  # noqa: BLE001
            bb.motion = ""
    if not bb.motion:
        other = next((h for h in hits if h.brain_id != hits[0].brain_id), None)
        bb.motion = (f"把「{hits[0].brain_name}」里的做法搬到「{other.brain_name}」上是否值得"
                     if other else f"「{hits[0].brain_name}」里的这几条笔记能否合成一个可执行的方案")

    hit_chunks = find("chunks", {"_id": {"$in": [h.chunk_id for h in hits]}}, fields=["tags"])
    bb.resources = sorted({t for c in hit_chunks for t in (c.get("tags") or [])})[:10]

    _save(debate_id, bb, status="running", motion=bb.motion)
    yield Event(type="debate.started", data={
        "debate_id": debate_id, "motion": bb.motion,
        "roles": [{"role": r, "cn": ROLES[r]["cn"], "brain_id": a.brain_id,
                   "brain_name": a.brain_name} for r, a in agents.items()],
        "hits": [h.model_dump() for h in hits[:8]],
    })

    # ---------------------------------------------------------------- loop
    claim_vecs: list[np.ndarray] = []
    recent: list[str] = []
    tokens = int(row.get("tokens_used") or 0)
    seq = 0
    stop_reason = "max_rounds"

    for rnd in range(1, cfg.max_rounds + 1):
        bb.round = rnd
        yield Event(type="round.started", data={"round": rnd})
        round_novelty: list[float] = []
        had_attack = False

        for role in ROLE_ORDER:
            if tokens >= cfg.token_budget:
                stop_reason = "budget"
                break
            a = agents[role]
            force = (cfg.require_attack_per_round and role == "pragmatist"
                     and not had_attack)
            payload, used, reason = await _speak(a, bb, recent, force_attack=force)
            tokens += used

            if reason:   # one retry, then record as rejected and move on
                yield Event(type="turn.rejected", data={"role": role, "reason": reason})
                payload, used2, reason = await _speak(a, bb, recent, force_attack=force,
                                                      retry_reason=reason)
                tokens += used2
                used += used2
            if reason:
                _persist_turn(debate_id, rnd, seq, a, {"body": "", "stance": None},
                              rejected=True, tokens=used, novelty=None)
                seq += 1
                continue

            claim = str(payload.get("claim") or payload["body"])[:180]
            cvec = (await embed_texts([claim]))[0]
            nov = bbmod.novelty(cvec, claim_vecs)
            if nov < cfg.novelty_threshold:
                yield Event(type="turn.rejected",
                            data={"role": role, "reason": f"复读 (novelty={nov:.2f})"})
                payload, used2, r2 = await _speak(a, bb, recent, force_attack=force,
                                                   retry_reason="你在重复黑板上已有的观点")
                tokens += used2
                if r2:
                    seq += 1
                    continue
                claim = str(payload.get("claim") or payload["body"])[:180]
                cvec = (await embed_texts([claim]))[0]
                nov = bbmod.novelty(cvec, claim_vecs)

            claim_vecs.append(cvec)
            round_novelty.append(nov)
            stance = payload.get("stance", "support")
            had_attack = had_attack or stance == "attack"

            cites = [a.frag_ids[t] for t in payload.get("citations", []) if t in a.frag_ids]
            c = bbmod.add_claim(bb, role, a.brain_id, claim, stance, cites, rnd)
            bbmod.mark_refuted(bb, [x for x in payload.get("attacks", []) if isinstance(x, str)])
            a.notes = claim[:120]
            recent.append(f"{ROLES[role]['cn']}：{payload['body']}")

            turn = _persist_turn(debate_id, rnd, seq, a, payload, rejected=False,
                                 tokens=used, novelty=nov, claim=claim, citations=cites,
                                 claim_id=c.id)
            seq += 1
            yield Event(type="turn.done", data=turn)
            await asyncio.sleep(0)  # let the SSE flush; also paces the stage demo

        bb = await bbmod.compact(bb)
        _save(debate_id, bb, tokens=tokens)
        yield Event(type="blackboard.updated", data=bb.model_dump())

        if tokens >= cfg.token_budget:
            stop_reason = "budget"
            break
        if round_novelty and max(round_novelty) < cfg.novelty_threshold * 1.6 and rnd >= 2:
            stop_reason = "converged"
            break

    # ---------------------------------------------------------------- cards
    # Distinct one-letter prefix per role — "proposer" and "pragmatist" both
    # start with PR, which silently collapsed the citation map. Do not shorten.
    TAG = {"proposer": "P", "analogist": "A", "skeptic": "S", "pragmatist": "G"}
    all_frags = [(f"{TAG[r]}{t}", txt)
                 for r, ag in agents.items() for t, txt in ag.fragments]
    frag_ids = {f"{TAG[r]}{t}": cid
                for r, ag in agents.items() for t, cid in ag.frag_ids.items()}
    cards, ctok = await build_cards(debate_id, bb, all_frags, frag_ids, "\n".join(recent))
    tokens += ctok
    for card in cards:
        yield Event(type="card.created", data=card.model_dump())

    _save(debate_id, bb, status=("converged" if stop_reason == "converged" else "stopped"),
          tokens=tokens, ended=True)
    yield Event(type="debate.ended", data={"reason": stop_reason, "rounds": bb.round,
                                           "tokens": tokens, "cards": len(cards)})


# --------------------------------------------------------------- internals
async def _speak(a: Agent, bb: Blackboard, recent: list[str], *,
                 force_attack: bool = False, retry_reason: str = ""):
    system = prompts.role_system(a.role, a.brain_name,
                                 (a.brain or {}).get("persona") if a.brain else None)
    user = prompts.role_user(bb, a.fragments, recent, a.notes,
                             force_attack=force_attack, retry_reason=retry_reason)
    try:
        res = await a.provider.chat(system, user, max_tokens=450, temperature=0.95,
                                    json_mode=True)
    except Exception as e:  # noqa: BLE001
        log.warning("provider error for %s: %s", a.role, e)
        return {}, 0, f"provider error: {e}"
    payload = res.json()
    used = res.tokens or bbmod.est_tokens(system + user + res.text)
    return payload, used, _valid(payload, a.role)


def _persist_turn(debate_id, rnd, seq, a: Agent, payload, *, rejected, tokens,
                  novelty, claim=None, citations=None, claim_id=None) -> dict:
    rec = dict(
        id=nid("trn"), debate_id=debate_id, round=rnd, seq=seq, role=a.role,
        brain_id=a.brain_id, brain_name=a.brain_name, claim_id=claim_id,
        stance=payload.get("stance"), claim=claim, body=payload.get("body", ""),
        citations=citations or [], attacks=payload.get("attacks", []) or [],
        novelty=novelty, rejected=bool(rejected), tokens=tokens, created_at=now(),
    )
    insert("turns", rec)
    return rec


def _save(debate_id, bb: Blackboard, *, status=None, motion=None, tokens=None, ended=False):
    sets: dict = {"blackboard": bb.model_dump()}
    if status:
        sets["status"] = status
    if motion:
        sets["motion"] = motion
    if tokens is not None:
        sets["tokens_used"] = tokens
    if ended:
        sets["ended_at"] = now()
    update_id("debates", debate_id, sets)
