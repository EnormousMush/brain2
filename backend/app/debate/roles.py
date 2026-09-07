"""固定 role 表 + 副脑绑定.

The app fixes the roles; the user brings the keys and the notes. Roles come from
the structure of a good roundtable, not from vibes — each one has a HARD
CONSTRAINT that the engine mechanically enforces. Without those constraints,
multi-agent debate degenerates into agents agreeing with each other, which is
the single most common failure of this kind of demo.
"""
from __future__ import annotations

import numpy as np

from ..db import find, from_blob
from ..models import Role

ROLE_ORDER: list[Role] = ["proposer", "analogist", "skeptic", "pragmatist"]

ROLES: dict[Role, dict] = {
    "moderator": {
        "cn": "主持人",
        "duty": "出辩题、控轮次、压缩黑板、判定收敛、结算卡片",
        "hard": "禁止提出任何新观点；只做归纳、点名与裁决。",
        "bound": False,
        "tier": "cheap",
    },
    "proposer": {
        "cn": "提案者",
        "duty": "提出并强化一个具体方案",
        "hard": "每次发言必须引用自己副脑里至少 1 条原文碎片，并给出可执行的下一步。",
        "bound": True,
        "tier": "main",
    },
    "analogist": {
        "cn": "类比者",
        "duty": "从最遥远的副脑迁移一个机制过来",
        "hard": "必须引入本轮尚未出现过的领域；禁止重复已在黑板上出现的类比。",
        "bound": True,
        "tier": "main",
    },
    "skeptic": {
        "cn": "怀疑者",
        "duty": "证伪：找失败模式、隐藏成本、反例",
        "hard": "禁止表达同意；每次发言必须给出 1 个可证伪的失败场景，并指名攻击某条 claim。",
        "bound": True,
        "tier": "main",
    },
    "pragmatist": {
        "cn": "实践者",
        "duty": "把想法压到用户已有的资源和时间里",
        "hard": "只能使用用户已有的技能/资源标签；不得假设任何新资源、新预算、新团队。",
        "bound": True,
        "tier": "main",
    },
}


def _brain_centroid(brain_id: str) -> np.ndarray | None:
    rows = find("chunks", {"brain_id": brain_id, "embedding": {"$ne": None}}, limit=400,
                fields=["embedding"])
    if not rows:
        return None
    M = np.stack([from_blob(r["embedding"]) for r in rows])
    v = M.mean(0)
    return v / max(float(np.linalg.norm(v)), 1e-6)


def _tag_count(brain_id: str) -> int:
    rows = find("chunks", {"brain_id": brain_id}, fields=["tags"])
    return sum(len(r.get("tags") or []) for r in rows)


def assign_brains(hits, qvec: np.ndarray) -> dict[Role, str]:
    """Deterministic role -> brain binding, driven by the retrieval result.

      proposer   = brain with the strongest hit           (it owns the idea)
      analogist  = brain whose centroid is furthest away  (it owns the leap)
      skeptic    = brain least aligned with the motion    (it owns the doubt)
      pragmatist = brain with the most skill/resource tags(it owns the cost)

    With fewer brains than roles we reuse brains but never merge roles — the
    roles, not the brains, are what stop the nodding.
    """
    brains: list[str] = []
    for h in hits:
        if h.brain_id not in brains:
            brains.append(h.brain_id)
    if not brains:
        rows = find("brains", sort=[("chunk_count", -1)], fields=["chunk_count"])
        brains = [r["id"] for r in rows]
    if not brains:
        return {}

    q = np.asarray(qvec, dtype="float32").ravel()
    q = q / max(float(np.linalg.norm(q)), 1e-6)
    cents = {b: _brain_centroid(b) for b in brains}

    proposer = brains[0]
    pc = cents.get(proposer)

    def far_from(v):
        cand = [b for b in brains if cents.get(b) is not None]
        if not cand or v is None:
            return brains[-1]
        return min(cand, key=lambda b: float(cents[b] @ v))

    analogist = far_from(pc) if len(brains) > 1 else proposer
    skeptic = far_from(q) if len(brains) > 1 else proposer
    if skeptic == analogist and len(brains) > 2:
        skeptic = next(b for b in brains if b not in (analogist, proposer))
    pragmatist = max(brains, key=_tag_count) if len(brains) > 1 else proposer

    return {"proposer": proposer, "analogist": analogist,
            "skeptic": skeptic, "pragmatist": pragmatist}
