"""Ingest: raw notes -> chunks -> embeddings -> clusters -> 3D layout.

Supported inputs (deliberately small — OAuth is out of scope for the hackathon):
  * a pasted block of text
  * .md / .txt / .csv files
  * a .zip export from Obsidian / Notion / Logseq (we just walk it for md+txt)
"""
from __future__ import annotations

import io
import re
import time
import zipfile
from pathlib import Path

import numpy as np

from ..config import CHUNK_OVERLAP, CHUNK_TARGET
from ..db import count, insert_many, nid, now, to_blob, update_id
from ..indexing.cluster import cluster_brain
from ..indexing.layout import layout_brain
from ..providers import get_embedder

_DATE = re.compile(r"(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})")
_TAGS = re.compile(r"#([\w一-鿿/-]{2,24})")
TEXT_EXT = {".md", ".txt", ".markdown", ".org", ".csv"}


# --------------------------------------------------------------- chunking
def split_text(text: str, target: int = CHUNK_TARGET, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Header-aware, then paragraph-aware, then hard wrap. Never mid-sentence
    if we can help it — a chunk is quoted verbatim on a card, so it must read."""
    text = text.replace("\r\n", "\n").strip()
    if not text:
        return []
    sections = re.split(r"\n(?=#{1,6}\s)", text)
    out: list[str] = []
    for sec in sections:
        paras = [p.strip() for p in re.split(r"\n\s*\n", sec) if p.strip()]
        buf = ""
        for p in paras:
            if len(buf) + len(p) + 2 <= target:
                buf = f"{buf}\n\n{p}".strip()
                continue
            if buf:
                out.append(buf)
            while len(p) > target * 1.6:
                cut = p.rfind("。", 0, target) + 1 or p.rfind(". ", 0, target) + 1 or target
                out.append(p[:cut].strip())
                p = p[max(cut - overlap, 0):]
            buf = p
        if buf:
            out.append(buf)
    return [c for c in (s.strip() for s in out) if len(c) >= 24]


def read_upload(filename: str, blob: bytes) -> list[tuple[str, str]]:
    """-> [(source_path, text)]"""
    suffix = Path(filename).suffix.lower()
    if suffix == ".zip":
        docs = []
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            for info in z.infolist():
                if info.is_dir() or Path(info.filename).suffix.lower() not in TEXT_EXT:
                    continue
                if info.file_size > 2_000_000:
                    continue
                try:
                    docs.append((info.filename, z.read(info).decode("utf-8", "ignore")))
                except Exception:  # noqa: BLE001
                    continue
        return docs
    return [(filename, blob.decode("utf-8", "ignore"))]


# ----------------------------------------------------------------- ingest
async def ingest_documents(brain_id: str, docs: list[tuple[str, str]]) -> dict:
    t0 = time.time()
    rows: list[dict] = []
    texts: list[str] = []
    for source_path, body in docs:
        for i, chunk in enumerate(split_text(body)):
            m = _DATE.search(chunk)
            content_date = f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else None
            rows.append(dict(id=nid("chk"), brain_id=brain_id, cluster_id=None, text=chunk,
                             source_path=source_path, source_loc=f"#{i}",
                             content_date=content_date, tags=_TAGS.findall(chunk)[:8],
                             embedding=None, x=None, y=None, z=None, created_at=now()))
            texts.append(chunk)

    if not rows:
        return {"chunks": 0, "clusters": 0, "seconds": round(time.time() - t0, 2)}

    vecs = await embed_texts(texts)
    for r, v in zip(rows, vecs):
        r["embedding"] = to_blob(v)
    insert_many("chunks", rows)
    update_id("brains", brain_id, {"chunk_count": count("chunks", {"brain_id": brain_id})})

    n_clusters = await cluster_brain(brain_id)
    layout_brain(brain_id)
    return {"chunks": len(rows), "clusters": n_clusters,
            "seconds": round(time.time() - t0, 2)}


async def embed_texts(texts: list[str]) -> np.ndarray:
    emb = get_embedder()
    out: list[np.ndarray] = []
    for i in range(0, len(texts), 128):
        out.append(await emb.embed(texts[i : i + 128]))
    return np.vstack(out)
