"""Eureka 模块 API.

Design rule: capture must NEVER block. POST /api/sparks writes the document and
returns in single-digit milliseconds; embedding, skeleton extraction and the
analogical hit preview happen in a background task and are polled (or pushed)
afterwards. If the user is typing faster than the model, the model loses.
"""
from __future__ import annotations

import re

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..db import delete_spark, find, get, insert, nid, now, to_blob, update_id
from ..ingest.pipeline import embed_texts
from ..models import Hit, Skeleton, Spark, SparkCreate
from ..retrieval.analogy import analogical_search
from ..retrieval.skeleton import extract_skeleton, skeleton_query

router = APIRouter(prefix="/api/sparks", tags=["sparks"])
URL = re.compile(r"https?://\S+")


def _to_spark(d: dict) -> Spark:
    return Spark(
        id=d["id"], text=d["text"], kind=d["kind"], status=d["status"],
        skeleton=Skeleton(**d["skeleton"]) if d.get("skeleton") else None,
        hits=[Hit(**h) for h in (d.get("hits") or [])],
        created_at=d["created_at"],
    )


async def enrich(spark_id: str, wildness: float = 0.5) -> None:
    d = get("sparks", spark_id)
    if not d:
        return
    try:
        sk = await extract_skeleton(d["text"])
        vec = (await embed_texts([skeleton_query(sk, d["text"])]))[0]
        hits = analogical_search(vec, wildness=wildness, k=8, min_brains=2)
        update_id("sparks", spark_id, {
            "status": "enriched", "skeleton": sk.model_dump(), "embedding": to_blob(vec),
            "hits": [h.model_dump() for h in hits],
        })
    except Exception:  # noqa: BLE001
        update_id("sparks", spark_id, {"status": "failed"})


@router.post("", response_model=Spark, status_code=201)
async def create_spark(body: SparkCreate, bg: BackgroundTasks):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "empty spark")
    kind = "link" if URL.search(text) else body.kind
    sid = nid("spk")
    insert("sparks", dict(id=sid, text=text, kind=kind, status="captured", skeleton=None,
                          embedding=None, hits=[], created_at=now()))
    bg.add_task(enrich, sid)          # <- the whole point: return immediately
    return _to_spark(get("sparks", sid))


@router.get("", response_model=list[Spark])
def list_sparks(limit: int = 50):
    return [_to_spark(d) for d in find("sparks", sort=[("created_at", -1)], limit=limit)]


@router.get("/{spark_id}", response_model=Spark)
def get_spark(spark_id: str):
    d = get("sparks", spark_id)
    if not d:
        raise HTTPException(404, "no such spark")
    return _to_spark(d)


@router.post("/{spark_id}/rehit", response_model=Spark)
async def rehit(spark_id: str, wildness: float = 0.5):
    """Powers the 保守<->疯狂 slider: same spark, different band centre, live."""
    await enrich(spark_id, wildness=wildness)
    return get_spark(spark_id)


@router.delete("/{spark_id}")
def remove_spark(spark_id: str):
    delete_spark(spark_id)
    return {"ok": True}
