from __future__ import annotations

import asyncio
import time
import uuid

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from ..db import count, delete_brain, find, get, insert, nid, now, update_id
from ..indexing.layout import layout_all
from ..ingest.pipeline import ingest_documents, read_upload
from ..models import Brain, IngestRequest, IngestResult

router = APIRouter(prefix="/api/brains", tags=["brains"])

PALETTE = ["#7aa2f7", "#f7768e", "#9ece6a", "#e0af68", "#bb9af7", "#7dcfff",
           "#ff9e64", "#73daca"]


def _to_brain(d: dict) -> Brain:
    return Brain(**{k: v for k, v in d.items() if k in Brain.model_fields})


@router.get("", response_model=list[Brain])
def list_brains():
    return [_to_brain(d) for d in find("brains", sort=[("created_at", 1)])]


def _create(name: str, kind: str, color: str | None, source: str) -> str:
    n = count("brains")
    bid = nid("brn")
    insert("brains", dict(id=bid, name=name, kind=kind, color=color or PALETTE[n % len(PALETTE)],
                          source=source, provider=None, model=None, persona=None,
                          chunk_count=0, created_at=now()))
    return bid


@router.post("/paste", response_model=IngestResult)
async def ingest_paste(req: IngestRequest):
    if not (req.text or "").strip():
        raise HTTPException(400, "text is empty")
    bid = _create(req.name, req.kind, req.color, "paste")
    stats = await ingest_documents(bid, [("pasted", req.text)])
    layout_all()
    return IngestResult(brain=_to_brain(get("brains", bid)), **stats)


@router.post("/upload", response_model=IngestResult)
async def ingest_upload(name: str = Form(...), kind: str = Form("domain"),
                        color: str | None = Form(None),
                        files: list[UploadFile] = File(...)):
    docs: list[tuple[str, str]] = []
    for f in files:
        docs += read_upload(f.filename or "upload", await f.read())
    if not docs:
        raise HTTPException(400, "没有可读取的文件（支持 .md .txt .csv .docx .pdf .html，或包含它们的 .zip / 文件夹）")
    bid = _create(name, kind, color, "upload")
    stats = await ingest_documents(bid, docs)
    layout_all()
    return IngestResult(brain=_to_brain(get("brains", bid)), **stats)


# ------------------------------------------------------------- import jobs
# The same import, but as a job the UI can watch: 读取 → 切分 → 向量化 → 聚类 → 布局.
# In-process and best-effort; a restart forgets running jobs, which is fine for
# something that lasts seconds to a minute.
JOBS: dict[str, dict] = {}
STAGE_CN = {"read": "读取文件", "split": "切分碎片", "embed": "向量化", "cluster": "聚类",
            "layout": "布局", "done": "完成", "failed": "失败"}


def _job_set(jid: str, **kw) -> None:
    j = JOBS.get(jid)
    if j:
        j.update(kw)
        j["stage_cn"] = STAGE_CN.get(j.get("stage", ""), j.get("stage", ""))
        j["updated_at"] = time.time()


async def _run_import(jid: str, name: str, kind: str, color: str | None, raw: list[tuple[str, bytes]]):
    try:
        docs: list[tuple[str, str]] = []
        for i, (fname, blob) in enumerate(raw):
            docs += read_upload(fname, blob)
            _job_set(jid, stage="read", done=i + 1, total=len(raw), files=len(docs))
            await asyncio.sleep(0)
        if not docs:
            _job_set(jid, stage="failed", error="没有可读取的文件")
            return
        bid = _create(name, kind, color, "upload")
        _job_set(jid, brain_id=bid, files=len(docs))
        stats = await ingest_documents(bid, docs, progress=lambda st, d, t: _job_set(jid, stage=st, done=d, total=t))
        layout_all()
        _job_set(jid, stage="done", done=stats["chunks"], total=stats["chunks"],
                 chunks=stats["chunks"], clusters=stats["clusters"], seconds=stats["seconds"])
    except Exception as e:  # noqa: BLE001
        _job_set(jid, stage="failed", error=str(e)[:200])


@router.post("/import", status_code=202)
async def start_import(bg: BackgroundTasks, name: str = Form(...), kind: str = Form("domain"),
                       color: str | None = Form(None), files: list[UploadFile] = File(...)):
    raw = [(f.filename or "upload", await f.read()) for f in files]
    jid = uuid.uuid4().hex[:10]
    JOBS[jid] = {"id": jid, "name": name, "stage": "read", "stage_cn": STAGE_CN["read"], "done": 0,
                 "total": len(raw), "files": 0, "brain_id": None, "error": None, "created_at": time.time()}
    bg.add_task(_run_import, jid, name, kind, color, raw)
    return JOBS[jid]


@router.get("/import/{jid}")
def import_status(jid: str):
    j = JOBS.get(jid)
    if not j:
        raise HTTPException(404, "no such job")
    return j


@router.patch("/{brain_id}", response_model=Brain)
def update_brain(brain_id: str, patch: dict):
    allowed = {"name", "color", "kind", "provider", "model", "persona"}
    sets = {k: v for k, v in patch.items() if k in allowed}
    if not get("brains", brain_id):
        raise HTTPException(404, "no such brain")
    if sets:
        update_id("brains", brain_id, sets)
    return _to_brain(get("brains", brain_id))


@router.delete("/{brain_id}")
def remove_brain(brain_id: str):
    delete_brain(brain_id)          # cascades to chunks + clusters
    layout_all()
    return {"ok": True}


@router.get("/{brain_id}/chunks")
def brain_chunks(brain_id: str, limit: int = 50):
    rows = find("chunks", {"brain_id": brain_id}, limit=limit,
                fields=["text", "source_path", "cluster_id", "tags"])
    return [{**r, "tags": r.get("tags") or []} for r in rows]
