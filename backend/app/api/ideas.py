"""想法 API —— 灵光捕捉、归档、弃稿箱。

两条设计规则，都不要改：

1. **捕捉绝不阻塞。** POST /api/ideas 写完文档就返回（个位数毫秒）；嵌入、问题骨架
   抽取、类比预览全在后台任务里跑，之后轮询拿。用户打字比模型快的时候，输的是模型。

2. **想法不是碎片。** 它们在自己的集合里，永远不进 `analogical_search` 的语料，
   所以 agent 不可能把用户自己的想法当"证据"引用回给用户。agent 可以读想法
   （拿来当辩题、当夜间素材）并重组，但引用不到 —— 这是靠数据结构保证的，
   不是靠 prompt 里写一句"请不要"。
"""
from __future__ import annotations

import base64
import binascii
import re

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from ..config import DATA_DIR
from ..db import (brain_map, delete_idea, find, get, insert, nid, now, to_blob,
                  update_id)
from ..indexing.layout import layout_ideas
from ..ingest.pipeline import embed_texts
from ..models import Hit, Idea, IdeaCreate, IdeaImage, IdeaPatch, IdeaSource, Skeleton
from ..retrieval.analogy import analogical_search
from ..retrieval.skeleton import extract_skeleton, skeleton_query

router = APIRouter(prefix="/api/ideas", tags=["ideas"])

IMAGE_DIR = DATA_DIR / "idea_images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
DATA_URL = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,(.+)$", re.S)
MAX_IMAGE_BYTES = 6 * 1024 * 1024      # the client downscales; this is the backstop


def _to_idea(d: dict, bm: dict | None = None) -> Idea:
    bm = brain_map() if bm is None else bm
    img = d.get("image")
    return Idea(
        id=d["id"], text=d.get("text") or "", origin=d.get("origin") or "user",
        kind=d.get("kind") or "eureka", status=d.get("status") or "kept",
        brain_id=d.get("brain_id"),
        brain_name=bm.get(d.get("brain_id") or "", {}).get("name"),
        image=IdeaImage(**img) if img else None,
        enrichment=d.get("enrichment") or "pending",
        skeleton=Skeleton(**d["skeleton"]) if d.get("skeleton") else None,
        hits=[Hit(**h) for h in (d.get("hits") or [])],
        source=IdeaSource(**d["source"]) if d.get("source") else None,
        debate_id=d.get("debate_id"), created_at=d["created_at"],
    )


def _save_image(idea_id: str, data_url: str, caption: str) -> dict | None:
    m = DATA_URL.match(data_url.strip())
    if not m:
        raise HTTPException(400, "image must be a data:image/...;base64 URL")
    ext = "jpg" if m.group(1) in ("jpeg", "jpg") else m.group(1)
    try:
        blob = base64.b64decode(m.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "image is not valid base64") from None
    if len(blob) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "图片超过 6MB")
    rel = f"idea_images/{idea_id}.{ext}"
    (DATA_DIR / rel).write_bytes(blob)
    return {"path": rel, "caption": caption[:200]}


async def enrich(idea_id: str, wildness: float = 0.5) -> None:
    """问题骨架 + 反相似度预览。捕捉之后在后台跑，失败了也不影响想法本身存在。"""
    d = get("ideas", idea_id)
    if not d:
        return
    text = d.get("text") or ((d.get("image") or {}).get("caption") or "")
    if not text.strip():
        update_id("ideas", idea_id, {"enrichment": "failed"})
        return
    try:
        sk = await extract_skeleton(text)
        vec = (await embed_texts([skeleton_query(sk, text)]))[0]
        hits = analogical_search(vec, wildness=wildness, k=8, min_brains=2)
        update_id("ideas", idea_id, {
            "enrichment": "ready", "skeleton": sk.model_dump(), "embedding": to_blob(vec),
            "hits": [h.model_dump() for h in hits],
        })
        layout_ideas()          # now that it has a vector it can sit next to its neighbours
    except Exception:  # noqa: BLE001
        update_id("ideas", idea_id, {"enrichment": "failed"})


# --------------------------------------------------------------------- CRUD
@router.post("", response_model=Idea, status_code=201)
async def create_idea(body: IdeaCreate, bg: BackgroundTasks):
    text = (body.text or "").strip()
    if not text and not body.image_data_url:
        raise HTTPException(400, "想法内容不能为空")
    iid = nid("ida")
    image = _save_image(iid, body.image_data_url, body.image_caption) if body.image_data_url else None
    insert("ideas", dict(
        id=iid, text=text, origin="user", kind=body.kind, status="kept",
        brain_id=body.brain_id, image=image, enrichment="pending", skeleton=None,
        embedding=None, hits=[], x=None, y=None, z=None, source=None,
        debate_id=None, created_at=now(), decided_at=None,
    ))
    layout_ideas()            # on the chart immediately, refined once enrichment lands
    bg.add_task(enrich, iid)  # <- the whole point: return immediately
    return _to_idea(get("ideas", iid))


@router.get("", response_model=list[Idea])
def list_ideas(status: str | None = None, origin: str | None = None, limit: int = 100):
    flt: dict = {}
    if status:
        flt["status"] = status
    if origin:
        flt["origin"] = origin
    bm = brain_map()
    return [_to_idea(d, bm) for d in
            find("ideas", flt, sort=[("created_at", -1)], limit=limit)]


@router.get("/{idea_id}", response_model=Idea)
def get_idea(idea_id: str):
    d = get("ideas", idea_id)
    if not d:
        raise HTTPException(404, "no such idea")
    return _to_idea(d)


@router.get("/{idea_id}/image")
def idea_image(idea_id: str):
    d = get("ideas", idea_id)
    path = DATA_DIR / ((d or {}).get("image") or {}).get("path", "")
    if not d or not (d.get("image") and path.is_file()):
        raise HTTPException(404, "no image on this idea")
    return FileResponse(path)


@router.patch("/{idea_id}", response_model=Idea)
def patch_idea(idea_id: str, patch: IdeaPatch, bg: BackgroundTasks):
    """归档 / 改文字 / 收进弃稿箱。brain_id=null 是合法值（= 取消归档），
    所以这里必须看 `fields_set`，不能用 `if v is not None` 过滤。"""
    d = get("ideas", idea_id)
    if not d:
        raise HTTPException(404, "no such idea")
    sets: dict = {}
    given = patch.model_dump(exclude_unset=True)
    if "text" in given:
        sets["text"] = (given["text"] or "").strip()
    if "brain_id" in given:
        if given["brain_id"] and not get("brains", given["brain_id"]):
            raise HTTPException(400, "no such brain")
        sets["brain_id"] = given["brain_id"]
    if "status" in given:
        sets["status"] = given["status"]
        sets["decided_at"] = now()
    if "image_caption" in given and d.get("image"):
        sets["image"] = {**d["image"], "caption": (given["image_caption"] or "")[:200]}
    if sets:
        update_id("ideas", idea_id, sets)
        layout_ideas()
    # accepted proposals arrive with no vector (we do not embed what nobody wants),
    # so enrich on the way in — that is what gives them a place on the chart
    if sets.get("status") == "kept" and d.get("enrichment") != "ready":
        bg.add_task(enrich, idea_id)
    return _to_idea(get("ideas", idea_id))


@router.post("/{idea_id}/rehit", response_model=Idea)
async def rehit(idea_id: str, wildness: float = 0.5):
    """Powers the 保守<->疯狂 slider: same idea, different band centre, live."""
    await enrich(idea_id, wildness=wildness)
    return get_idea(idea_id)


@router.delete("/{idea_id}")
def remove_idea(idea_id: str):
    """Real delete. The soft one is PATCH status=trashed (弃稿箱，可恢复)。"""
    d = get("ideas", idea_id)
    if d and d.get("image"):
        (DATA_DIR / d["image"]["path"]).unlink(missing_ok=True)
    delete_idea(idea_id)
    layout_ideas()
    return {"ok": True}
