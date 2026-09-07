"""结算：把辩论压成 1-3 张想法卡片，并打分。

The LLM here is a scribe, not an author: it may only reassemble fragments that
were already on the table. That constraint is what makes every card traceable
back to the user's own words — which is the answer to both "这不就是套壳吗"
and "你怎么证明这是好点子".

score = 0.45*surprise + 0.30*credibility + 0.25*feasibility
  surprise    = mean pairwise embedding distance between the connected fragments
  credibility = how many debate turns cited those fragments (normalised)
  feasibility = overlap between the card and the user's own skill/resource tags
"""
from __future__ import annotations

import numpy as np

from ..db import brain_map, find, from_blob, insert, nid, now
from ..models import Blackboard, Card, Connection, Scores
from ..providers import get_moderator
from . import prompts

W = (0.45, 0.30, 0.25)


def _surprise(chunk_ids: list[str]) -> float:
    rows = find("chunks", {"_id": {"$in": chunk_ids}}, fields=["embedding"]) if chunk_ids else []
    vs = [from_blob(r["embedding"]) for r in rows if r.get("embedding")]
    if len(vs) < 2:
        return 0.0
    d = [1.0 - float(vs[i] @ vs[j]) for i in range(len(vs)) for j in range(i + 1, len(vs))]
    return float(np.clip(np.mean(d), 0.0, 1.0))


def _credibility(debate_id: str, chunk_ids: list[str]) -> float:
    rows = find("turns", {"debate_id": debate_id, "rejected": False}, fields=["citations"])
    cited: list[str] = []
    for r in rows:
        cited += r.get("citations") or []
    if not chunk_ids:
        return 0.0
    hits = sum(cited.count(c) for c in chunk_ids)
    return float(np.clip(hits / (2.0 * len(chunk_ids)), 0.0, 1.0))


def _feasibility(text: str) -> float:
    rows = find("chunks", {}, fields=["tags"])
    tags = {t for r in rows for t in (r.get("tags") or [])}
    if not tags:
        return 0.4          # unknown, not zero — don't punish users without #tags
    hit = sum(1 for t in tags if t and t in text)
    return float(np.clip(hit / 3.0, 0.0, 1.0))


async def build_cards(debate_id: str, bb: Blackboard, fragments: list[tuple[str, str]],
                      frag_ids: dict[str, str], transcript: str) -> tuple[list[Card], int]:
    mod = get_moderator()
    try:
        res = await mod.chat(prompts.CARD_SYSTEM,
                             prompts.card_user(bb, fragments, transcript),
                             max_tokens=900, temperature=0.6, json_mode=True)
        raw = res.json().get("cards") or []
        used = res.tokens
    except Exception:  # noqa: BLE001
        raw, used = [], 0

    out: list[Card] = []
    bm = brain_map()
    for item in raw[:3]:
        tags = [t for t in (item.get("connection") or []) if t in frag_ids]
        chunk_ids = [frag_ids[t] for t in tags]
        by_id = {r["id"]: r for r in find("chunks", {"_id": {"$in": chunk_ids}},
                                          fields=["brain_id", "text", "source_path"])}
        conns: list[Connection] = []
        for cid in chunk_ids:            # keep the LLM's order, not Mongo's
            r = by_id.get(cid)
            if r:
                conns.append(Connection(chunk_id=r["id"], brain_id=r["brain_id"],
                                        brain_name=bm.get(r["brain_id"], {}).get("name", "?"),
                                        quote=r["text"][:220],
                                        source_path=r.get("source_path")))
        # hard rule: a card must span >= 2 副脑, otherwise it is not a discovery
        if len({c.brain_id for c in conns}) < 2:
            continue

        body = f"{item.get('idea','')} {item.get('why_you','')} {item.get('next_action','')}"
        s = Scores(surprise=_surprise(chunk_ids),
                   credibility=_credibility(debate_id, chunk_ids),
                   feasibility=_feasibility(body))
        s.total = round(W[0] * s.surprise + W[1] * s.credibility + W[2] * s.feasibility, 3)

        card = Card(id=nid("crd"), debate_id=debate_id, connection=conns,
                    idea=str(item.get("idea", ""))[:200],
                    why_you=str(item.get("why_you", ""))[:300],
                    next_action=str(item.get("next_action", ""))[:200],
                    scores=s, saved=False, created_at=now())
        insert("cards", card.model_dump())
        out.append(card)

    out.sort(key=lambda c: c.scores.total, reverse=True)
    return out, used
