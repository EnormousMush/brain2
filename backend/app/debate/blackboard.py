"""黑板 (blackboard) — how agents talk for a long time without eating the context
window or the user's money.

THE RULE: an agent never sees the transcript. It sees

    system(role card)                       ~250 tok   fixed
  + 辩题 motion                              ~60  tok   fixed
  + blackboard digest + live claims          <=800 tok  BOUNDED by compaction
  + its own private retrieval (its 副脑)      <=1200 tok fixed
  + last 2 turns verbatim                    <=600 tok  fixed window
  + its own private notes                    <=200 tok  fixed
  ------------------------------------------------------
  ~= 3.1k tokens per turn, INDEPENDENT of round count.

So a 30-round debate costs 30 x 3.1k, not sum(1..30) x 3.1k. That single
property is what makes "长时间交流" affordable, and it is the sentence to say
to the judges.
"""
from __future__ import annotations

import numpy as np

from ..db import nid
from ..models import Blackboard, Claim, Role
from ..providers import get_moderator

MAX_LIVE_CLAIMS = 12          # beyond this, the moderator compacts
DIGEST_CHARS = 700
RECENT_TURNS = 2
CHARS_PER_TOKEN = 2.2         # rough CJK-friendly estimate


def est_tokens(s: str) -> int:
    return int(len(s) / CHARS_PER_TOKEN)


def add_claim(bb: Blackboard, role: Role, brain_id: str | None, text: str,
              stance: str, citations: list[str], rnd: int) -> Claim:
    c = Claim(id=nid("clm"), role=role, brain_id=brain_id, text=text[:180],
              stance=stance, citations=citations, round=rnd)
    bb.claims.append(c)
    return c


def mark_refuted(bb: Blackboard, claim_ids: list[str]) -> None:
    for c in bb.claims:
        if c.id in claim_ids and c.status == "live":
            c.status = "refuted"


def live_claims(bb: Blackboard) -> list[Claim]:
    return [c for c in bb.claims if c.status == "live"]


def render(bb: Blackboard, budget_chars: int = 1600) -> str:
    """The bounded view every agent gets."""
    lines = [f"【辩题】{bb.motion}", f"【当前轮次】第 {bb.round} 轮"]
    if bb.digest:
        lines.append(f"【前情摘要】{bb.digest}")
    live = live_claims(bb)[-MAX_LIVE_CLAIMS:]
    if live:
        lines.append("【在场主张】")
        lines += [f"  [{c.id}] ({c.role}/{c.stance}) {c.text}" for c in live]
    refuted = [c for c in bb.claims if c.status == "refuted"][-4:]
    if refuted:
        lines.append("【已被驳倒】" + "；".join(c.text[:40] for c in refuted))
    if bb.open_questions:
        lines.append("【未解问题】" + "；".join(bb.open_questions[-4:]))
    if bb.agreements:
        lines.append("【已达成】" + "；".join(bb.agreements[-4:]))
    if bb.resources:
        lines.append("【已有资源】" + "、".join(bb.resources[-8:]))
    out = "\n".join(lines)
    return out[:budget_chars]


# ---------------------------------------------------------------- novelty
def novelty(vec: np.ndarray, existing: list[np.ndarray]) -> float:
    """1 - max cosine to any claim already on the board. Low => 复读."""
    if not existing:
        return 1.0
    v = np.asarray(vec, dtype="float32").ravel()
    v = v / max(float(np.linalg.norm(v)), 1e-6)
    E = np.stack(existing)
    return float(np.clip(1.0 - float(np.max(E @ v)), 0.0, 1.0))


# -------------------------------------------------------------- compaction
COMPACT_SYSTEM = """你是圆桌主持人的记录员。把下面的辩论状态压缩成一段不超过 200 字的
中文摘要，只保留：仍然成立的核心分歧、已被驳倒的路线（一句带过）、以及新出现的资源。
不要评价，不要新增观点。只输出 JSON：
{"digest":"...","open_questions":["..."],"agreements":["..."]}"""


async def compact(bb: Blackboard) -> Blackboard:
    """Runs every round on the CHEAP model. Keeps the board size flat."""
    live = live_claims(bb)
    if len(live) <= MAX_LIVE_CLAIMS and len(bb.digest) < DIGEST_CHARS:
        return bb
    mod = get_moderator()
    payload = render(bb, budget_chars=4000)
    try:
        res = await mod.chat(COMPACT_SYSTEM, payload, max_tokens=400,
                             temperature=0.2, json_mode=True)
        d = res.json()
        if d.get("digest"):
            bb.digest = str(d["digest"])[:DIGEST_CHARS]
            bb.open_questions = [str(x)[:80] for x in (d.get("open_questions") or [])][:6]
            bb.agreements = [str(x)[:80] for x in (d.get("agreements") or [])][:6]
            # keep only the most recent live claims; the rest now live in the digest
            keep = {c.id for c in live[-MAX_LIVE_CLAIMS // 2:]}
            for c in bb.claims:
                if c.status == "live" and c.id not in keep:
                    c.status = "accepted"
    except Exception:  # noqa: BLE001 — compaction must never kill a debate
        bb.claims = bb.claims[-MAX_LIVE_CLAIMS:]
    return bb
