"""Graph API — serves ONE zoom level at a time. That is the whole trick.

Obsidian ships every node to the renderer and produces a hairball. We serve:
  level=brain    -> a handful of galaxies
  level=cluster  -> named constellations for one brain (or all)
  level=chunk    -> individual stars; scoped to a brain/cluster, or ALL of them
                    when nothing is scoped (the 「展开碎片」 view), capped

Every level also carries the 共现边 (indexing/cooccurrence.py): who got connected
to whom by an actual debate. At brain level those edges are the aggregate — the
short answer to 「这套东西到底接通了什么」.

想法节点 (level="idea") ride along on every level. Only `kept` ideas have
coordinates, so an agent proposal still sitting in the 收件箱 is invisible here
by construction — the chart shows what you have said yes to, nothing else.

Coordinates are precomputed and stable (see indexing/layout.py); the frontend
pins them so the force simulation cannot drift.
"""
from __future__ import annotations

import hashlib

from fastapi import APIRouter, Query

from ..config import MAX_RENDER_NODES
from ..db import brain_map, count, find, get
from ..indexing import cooccurrence
from ..models import GraphLink, GraphNode, GraphResponse

router = APIRouter(prefix="/api/graph", tags=["graph"])

IDEA_COLOR = "#C6A15B"      # unfiled ideas: the one non-cobalt ink on the chart


def _idea_nodes(bm: dict, brain_id: str | None = None) -> list[GraphNode]:
    """Kept ideas with coordinates. Scoped to one 副脑 when drilling in;
    unscoped it also returns the unfiled ones floating at the centre."""
    flt: dict = {"status": "kept", "x": {"$ne": None}}
    if brain_id:
        flt["brain_id"] = brain_id
    out = []
    for d in find("ideas", flt, fields=["text", "brain_id", "image", "origin", "x", "y", "z"]):
        b = bm.get(d.get("brain_id") or "", {})
        text = (d.get("text") or (d.get("image") or {}).get("caption") or "").replace("\n", " ")
        out.append(GraphNode(
            id=d["id"], level="idea",
            # short: the chart is not the place to read an idea, only to spot one
            label=(text[:8] + "…" if len(text) > 9 else text) or "（图片）",
            brain_id=d.get("brain_id") or "", color=b.get("color") or IDEA_COLOR,
            x=d["x"], y=d["y"], z=d["z"], size=2.6,
            preview=f'{"我的想法" if d.get("origin") == "user" else "agent 的提案"}'
                    f' · {b.get("name") or "未归档"}\n{text[:200]}'))
    return out


def _seed_links(idea_ids: set[str], to_brain: bool) -> list[GraphLink]:
    """想法 -> 它开出的那场辩论真正用到的东西。`to_brain` 聚合到副脑，否则连到碎片。"""
    debates = {d["id"]: d.get("idea_id") for d in
               find("debates", {"idea_id": {"$in": list(idea_ids)}}, fields=["idea_id"])}
    if not debates:
        return []
    owner = ({c["id"]: c["brain_id"] for c in find("chunks", fields=["brain_id"])}
             if to_brain else {})
    links, seen = [], set()
    for did, frags in cooccurrence.debate_fragment_sets().items():
        iid = debates.get(did)
        if not iid:
            continue
        for cid in frags:
            target = owner.get(cid) if to_brain else cid
            if target and (iid, target) not in seen:
                seen.add((iid, target))
                links.append(GraphLink(source=iid, target=target, kind="seed", weight=1.0))
    return links


def _brain_size(b: dict) -> float:
    """Radius grows with the log of the fragment count (a 1600-fragment vault
    must not eclipse a 15-note one), then a deterministic ±18% per brain so
    equal-sized brains still differ."""
    import math
    n = b.get("chunk_count") or 0
    seed = int(hashlib.sha1(b["id"].encode()).hexdigest()[:6], 16) / 0xFFFFFF   # 0..1
    return round((3.0 + 1.7 * math.log1p(n)) * (0.82 + 0.36 * seed), 2)


@router.get("", response_model=GraphResponse)
def get_graph(level: str = Query("brain", pattern="^(brain|cluster|chunk)$"),
              brain_id: str | None = None, cluster_id: str | None = None,
              limit: int = MAX_RENDER_NODES):
    total = count("chunks")
    nodes: list[GraphNode] = []
    links: list[GraphLink] = []
    bm = brain_map()

    if level == "brain":
        for b in sorted(bm.values(), key=lambda x: x.get("created_at", "")):
            cs = find("clusters", {"brain_id": b["id"], "x": {"$ne": None}},
                      fields=["x", "y", "z"])
            cx = sum(c["x"] for c in cs) / len(cs) if cs else 0.0
            cy = sum(c["y"] for c in cs) / len(cs) if cs else 0.0
            cz = sum(c["z"] for c in cs) / len(cs) if cs else 0.0
            nodes.append(GraphNode(id=b["id"], level="brain", label=b["name"],
                                   brain_id=b["id"], color=b["color"], x=cx, y=cy, z=cz,
                                   size=_brain_size(b),
                                   preview=f'{b.get("chunk_count", 0)} 条碎片 · {b.get("kind")}'))
        seen = {n.id for n in nodes}
        links = [l for l in cooccurrence.brain_links()
                 if l.source in seen and l.target in seen]
        ideas = _idea_nodes(bm)
        nodes += ideas
        links += [l for l in _seed_links({n.id for n in ideas}, to_brain=True)
                  if l.target in seen]
        return GraphResponse(level="brain", nodes=nodes, links=links, total_chunks=total)

    if level == "cluster":
        flt = {"brain_id": brain_id} if brain_id else {}
        for c in find("clusters", flt):
            b = bm.get(c["brain_id"], {})
            nodes.append(GraphNode(id=c["id"], level="cluster", label=c["label"],
                                   brain_id=c["brain_id"], color=b.get("color", "#7aa2f7"),
                                   x=c.get("x") or 0, y=c.get("y") or 0, z=c.get("z") or 0,
                                   size=max(3.0, (c.get("size") or 1) ** 0.5 * 1.5),
                                   preview=c.get("summary") or f'{c.get("size", 0)} 条'))
        nodes += _idea_nodes(bm, brain_id)
        return GraphResponse(level="cluster", nodes=nodes, links=links, total_chunks=total)

    flt: dict = {"x": {"$ne": None}}
    if brain_id:
        flt["brain_id"] = brain_id
    if cluster_id:
        flt["cluster_id"] = cluster_id
    rows = find("chunks", flt, limit=limit,
                fields=["brain_id", "cluster_id", "text", "source_path", "x", "y", "z"])
    for ch in rows:
        b = bm.get(ch["brain_id"], {})
        nodes.append(GraphNode(id=ch["id"], level="chunk",
                               label=(ch.get("text") or "")[:24].replace("\n", " "),
                               brain_id=ch["brain_id"], color=b.get("color", "#7aa2f7"),
                               x=ch["x"], y=ch["y"], z=ch["z"], size=1.6,
                               preview=(ch.get("text") or "")[:220],
                               source_path=ch.get("source_path")))
    if cluster_id or brain_id:
        # Only inside a scope. Unscoped, the whole corpus's containment edges are
        # exactly the hairball we refuse to draw — there the 共现边 carry the view.
        by_cluster: dict[str, list[str]] = {}
        for ch in rows:
            if ch.get("cluster_id"):
                by_cluster.setdefault(ch["cluster_id"], []).append(ch["id"])
        for members in by_cluster.values():   # star topology, not n^2 spaghetti
            for m in members[1:]:
                links.append(GraphLink(source=members[0], target=m, kind="contains",
                                       weight=0.2))
    chunk_ids = {n.id for n in nodes}
    links += cooccurrence.chunk_links(allowed=chunk_ids)
    ideas = _idea_nodes(bm, brain_id)
    nodes += ideas
    links += [l for l in _seed_links({n.id for n in ideas}, to_brain=False)
              if l.target in chunk_ids]
    return GraphResponse(level="chunk", nodes=nodes, links=links, total_chunks=total)


@router.get("/chunk/{chunk_id}")
def get_chunk(chunk_id: str):
    d = get("chunks", chunk_id)
    if not d:
        return {}
    d.pop("embedding", None)
    b = get("brains", d["brain_id"]) or {}
    d["brain_name"] = b.get("name")
    d["color"] = b.get("color")
    d["tags"] = d.get("tags") or []
    return d
