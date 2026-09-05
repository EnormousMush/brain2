from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

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
        raise HTTPException(400, "no readable .md/.txt found (zip is walked, not extracted)")
    bid = _create(name, kind, color, "upload")
    stats = await ingest_documents(bid, docs)
    layout_all()
    return IngestResult(brain=_to_brain(get("brains", bid)), **stats)


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
