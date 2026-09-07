"""Rebuild the demo library from demo/seed_notes/<name>/*.md.

    cd backend && WEAVE_OFFLINE=1 .venv/bin/python ../demo/build_demo.py

Every brain is read from the committed seed notes, so every clone builds the
same library. Order matters: the star chart assigns hues by brain index.
"""
from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.db import backend, init_db, insert, nid, now, wipe_all  # noqa: E402
from app.indexing.layout import layout_all  # noqa: E402
from app.ingest.pipeline import ingest_documents  # noqa: E402

SEEDS = Path(__file__).resolve().parent / "seed_notes"

SKIP_NAMES = {"README.md", "_readme.md"}
SKIP_PREFIX = ("怎么记",)
FRONT = re.compile(r"^---\n.*?\n---\n", re.S)


def md_files(root: Path, subdirs: list[str] | None = None) -> list[tuple[str, str]]:
    """[(relative path, text)] for every readable markdown note under root."""
    out = []
    dirs = [root / d for d in subdirs] if subdirs else [root]
    for d in dirs:
        if not d.exists():
            print(f"  (missing: {d})")
            continue
        for f in sorted(d.rglob("*.md")):
            rel = str(f.relative_to(root))
            if any(part.startswith(".") for part in f.parts) or f.name in SKIP_NAMES or f.name.startswith(SKIP_PREFIX):
                continue
            text = FRONT.sub("", f.read_text(encoding="utf-8", errors="ignore"), count=1).strip()
            if len(text) >= 40:
                out.append((rel, text))
    return out


LIBRARY: list[tuple[str, str, object]] = [
    ("音乐·鼓与节奏",     "domain",  lambda: md_files(SEEDS / "音乐·鼓与节奏")),
    ("制作·混音与母带",   "domain",  lambda: md_files(SEEDS / "制作·混音与母带")),
    ("生活·烹饪与发酵",   "domain",  lambda: md_files(SEEDS / "生活·烹饪与发酵")),
    ("阅读·城市与交通",   "reading", lambda: md_files(SEEDS / "阅读·城市与交通")),
    ("游戏·规则设计",     "domain",  lambda: md_files(SEEDS / "游戏·规则设计")),
    ("工作·团队与沟通",   "project", lambda: md_files(SEEDS / "工作·团队与沟通")),
    ("学习·记忆与练习",   "domain",  lambda: md_files(SEEDS / "学习·记忆与练习")),
    ("摄影·光线与构图",   "domain",  lambda: md_files(SEEDS / "摄影·光线与构图")),
]


async def main() -> None:
    init_db()
    print(f"db backend: {backend()}")
    if "--keep" not in sys.argv:
        print("wiping:", wipe_all())
    total = 0
    for name, kind, produce in LIBRARY:
        docs = produce()
        if not docs:
            print(f"- {name}: no documents, skipped")
            continue
        bid = nid("brn")
        insert("brains", dict(id=bid, name=name, kind=kind, color="#7aa2f7", source="seed", provider=None,
                              model=None, persona=None, chunk_count=0, created_at=now()))
        stats = await ingest_documents(bid, docs)
        total += stats["chunks"]
        print(f"- {name}: {len(docs)} docs -> {stats['chunks']} chunks, {stats['clusters']} clusters")
    layout_all()
    print(f"done: {total} chunks")


if __name__ == "__main__":
    asyncio.run(main())
