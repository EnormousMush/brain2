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
DOC_EXT = {".docx", ".pdf", ".html", ".htm"}          # converted to plain text on the way in
READABLE = TEXT_EXT | DOC_EXT
SKIP_DIRS = (".obsidian/", ".trash/", "node_modules/", "__MACOSX/", ".git/")


def _html_text(raw: str) -> str:
    """Notion exports HTML; Obsidian publishes HTML. Keep headings as markdown
    headings so the chunker can still split on them."""
    import html as _html
    t = re.sub(r"(?is)<(script|style).*?</\1>", " ", raw)
    t = re.sub(r"(?is)<h([1-6])[^>]*>(.*?)</h\1>", lambda m: "\n" + "#" * int(m.group(1)) + " " + m.group(2) + "\n", t)
    t = re.sub(r"(?i)<(br|/p|/div|/li|/tr)\b[^>]*>", "\n", t)
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    t = _html.unescape(t)
    return re.sub(r"[ \t]+", " ", t)


def _docx_text(blob: bytes) -> str:
    import docx  # python-docx
    d = docx.Document(io.BytesIO(blob))
    out: list[str] = []
    for para in d.paragraphs:
        txt = para.text.strip()
        if not txt:
            continue
        style = (para.style.name or "").lower()
        if style.startswith("heading"):
            lvl = "".join(ch for ch in style if ch.isdigit()) or "1"
            out.append("#" * min(6, int(lvl)) + " " + txt)
        else:
            out.append(txt)
    for table in d.tables:                       # tables become one line per row
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                out.append(" | ".join(cells))
    return "\n\n".join(out)


def _pdf_text(blob: bytes) -> str:
    from pypdf import PdfReader
    r = PdfReader(io.BytesIO(blob))
    pages = []
    for i, page in enumerate(r.pages):
        t = (page.extract_text() or "").strip()
        if t:
            pages.append(f"# 第 {i + 1} 页\n{t}")
    return "\n\n".join(pages)


def to_text(filename: str, blob: bytes) -> str | None:
    """One file -> plain/markdown text, or None if we cannot read it. Never raises:
    a corrupt PDF in a 2,000-file vault must not abort the whole import."""
    suffix = Path(filename).suffix.lower()
    try:
        if suffix in TEXT_EXT:
            return blob.decode("utf-8", "ignore")
        if suffix == ".docx":
            return _docx_text(blob)
        if suffix == ".pdf":
            return _pdf_text(blob)
        if suffix in (".html", ".htm"):
            return _html_text(blob.decode("utf-8", "ignore"))
    except Exception:  # noqa: BLE001
        return None
    return None


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
                name = info.filename
                if info.is_dir() or Path(name).suffix.lower() not in READABLE:
                    continue
                if any(part in name for part in SKIP_DIRS) or Path(name).name.startswith("."):
                    continue
                if info.file_size > 20_000_000:
                    continue
                try:
                    text = to_text(name, z.read(info))
                except Exception:  # noqa: BLE001
                    continue
                if text and text.strip():
                    docs.append((name, text))
        return docs
    text = to_text(filename, blob)
    return [(filename, text)] if text and text.strip() else []


# ----------------------------------------------------------------- ingest
async def ingest_documents(brain_id: str, docs: list[tuple[str, str]],
                           progress=None) -> dict:
    """`progress(stage, done, total)` is called as work advances so an import job
    can show 切分 → 向量化 → 聚类 → 布局 to the user."""
    def report(stage: str, done: int = 0, total: int = 0) -> None:
        if progress:
            try:
                progress(stage, done, total)
            except Exception:  # noqa: BLE001
                pass
    t0 = time.time()
    report("split", 0, len(docs))
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
        report("done", 0, 0)
        return {"chunks": 0, "clusters": 0, "seconds": round(time.time() - t0, 2)}

    report("embed", 0, len(texts))
    emb = get_embedder()
    out: list[np.ndarray] = []
    for i in range(0, len(texts), 128):
        out.append(await emb.embed(texts[i : i + 128]))
        report("embed", min(len(texts), i + 128), len(texts))
    vecs = np.vstack(out)
    for r, v in zip(rows, vecs):
        r["embedding"] = to_blob(v)
    insert_many("chunks", rows)
    update_id("brains", brain_id, {"chunk_count": count("chunks", {"brain_id": brain_id})})

    report("cluster", 0, len(rows))
    n_clusters = await cluster_brain(brain_id)
    report("layout", n_clusters, n_clusters)
    layout_brain(brain_id)
    report("done", len(rows), len(rows))
    return {"chunks": len(rows), "clusters": n_clusters,
            "seconds": round(time.time() - t0, 2)}


async def embed_texts(texts: list[str]) -> np.ndarray:
    emb = get_embedder()
    out: list[np.ndarray] = []
    for i in range(0, len(texts), 128):
        out.append(await emb.embed(texts[i : i + 128]))
    return np.vstack(out)
