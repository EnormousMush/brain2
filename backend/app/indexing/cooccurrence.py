"""共现网络 —— 星图的第二层边：哪两条碎片曾在同一场辩论里被一起用过。

`contains` 边是我们本来就知道的关系（同一个簇 / 同一个副脑）。这一层不一样：
它是**辩论产生的**关系，是这套系统真正的产出物。一场辩论用到的碎片定义为

    未被驳回的发言引用的 chunk  ∪  结算卡片连接的 chunk

同一场里出现的每一对碎片之间连一条边，weight = 一起出现过的**场次**。
往上聚合到副脑层：跨副脑的场次数，就是「这两个副脑被接通过几次」。

规模：一场辩论 4 个角色 × 4 条碎片 + 卡片，撑死二三十条碎片，成对展开是几百条边。
全量重算比维护增量表便宜得多，所以这里不缓存、不落库，每次请求现算。
"""
from __future__ import annotations

from ..db import find
from ..models import GraphLink

MAX_EDGES = 1200        # 渲染上限；按 weight 降序截断，先扔掉只共现过一次的边


def debate_fragment_sets() -> dict[str, set[str]]:
    """debate_id -> 这场辩论用到的 chunk_id 集合（只保留 >= 2 条的场次）。"""
    sets: dict[str, set[str]] = {}
    for t in find("turns", {"rejected": False}, fields=["debate_id", "citations"]):
        if t.get("debate_id"):
            sets.setdefault(t["debate_id"], set()).update(t.get("citations") or [])
    for c in find("cards", fields=["debate_id", "connection"]):
        if not c.get("debate_id"):
            continue
        s = sets.setdefault(c["debate_id"], set())
        s.update(x["chunk_id"] for x in (c.get("connection") or []) if x.get("chunk_id"))
    return {d: f for d, f in sets.items() if len(f) >= 2}


def chunk_pairs() -> dict[tuple[str, str], set[str]]:
    """(chunk_a, chunk_b) 有序对 -> 共同出现过的 debate_id 集合。"""
    out: dict[tuple[str, str], set[str]] = {}
    for did, frags in debate_fragment_sets().items():
        ids = sorted(frags)
        for i, a in enumerate(ids):
            for b in ids[i + 1:]:
                out.setdefault((a, b), set()).add(did)
    return out


def _rank(weights: dict[tuple[str, str], set[str]], limit: int) -> list[GraphLink]:
    rows = sorted(weights.items(), key=lambda kv: -len(kv[1]))[:limit]
    return [GraphLink(source=a, target=b, kind="cooccur", weight=float(len(d)))
            for (a, b), d in rows]


def chunk_links(allowed: set[str] | None = None, limit: int = MAX_EDGES) -> list[GraphLink]:
    """碎片层的共现边。`allowed` 是本次实际渲染的 chunk_id —— 边不能指向画面外的点。"""
    pairs = chunk_pairs()
    if allowed is not None:
        pairs = {k: v for k, v in pairs.items() if k[0] in allowed and k[1] in allowed}
    return _rank(pairs, limit)


def brain_links(limit: int = MAX_EDGES) -> list[GraphLink]:
    """副脑层的共现边：把碎片对聚合到它们所属的副脑，丢掉副脑内部的自环。"""
    owner = {c["id"]: c["brain_id"] for c in find("chunks", fields=["brain_id"])}
    agg: dict[tuple[str, str], set[str]] = {}
    for (a, b), dids in chunk_pairs().items():
        ba, bb = owner.get(a), owner.get(b)
        if not ba or not bb or ba == bb:
            continue
        agg.setdefault((ba, bb) if ba < bb else (bb, ba), set()).update(dids)
    return _rank(agg, limit)
