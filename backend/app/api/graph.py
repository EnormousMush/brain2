"""Graph API — serves ONE zoom level at a time. That is the whole trick.

Obsidian ships every node to the renderer and produces a hairball. We serve:
  level=brain    -> a handful of galaxies
  level=cluster  -> named constellations for one brain (or all)
  level=chunk    -> individual stars, only within a brain/cluster, capped

Coordinates are precomputed and stable (see indexing/layout.py); the frontend
pins them so the force simulation cannot drift.
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from ..config import MAX_RENDER_NODES
from ..db import brain_map, count, find, get
from ..models import GraphLink, GraphNode, GraphResponse

router = APIRouter(prefix="/api/graph", tags=["graph"])


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
                                   size=max(4.0, (b.get("chunk_count") or 0) ** 0.5),
                                   preview=f'{b.get("chunk_count", 0)} 条碎片 · {b.get("kind")}'))
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
        by_cluster: dict[str, list[str]] = {}
        for ch in rows:
            if ch.get("cluster_id"):
                by_cluster.setdefault(ch["cluster_id"], []).append(ch["id"])
        for members in by_cluster.values():   # star topology, not n^2 spaghetti
            for m in members[1:]:
                links.append(GraphLink(source=members[0], target=m, kind="contains",
                                       weight=0.2))
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
