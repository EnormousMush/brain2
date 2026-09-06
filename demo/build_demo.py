"""Build the 路演 library: replace every 副脑 with a curated set.

    cd backend && WEAVE_OFFLINE=1 .venv/bin/python ../demo/build_demo.py

Two kinds of sources:
  * REAL   — Frank's own Obsidian vaults and project docs, read from local paths
             (never committed; set WEAVE_DEMO_HOME to point elsewhere).
  * SEEDED — demo/seed_notes/<name>/*.md, written for the demo and committed.

Order matters: the star chart assigns hues by brain index, so the real ones
come first and the seeded ones fill the far side of the palette.
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

HOME = Path(os.getenv("WEAVE_DEMO_HOME", str(Path.home())))
DEV = HOME / "Developer"
SEEDS = Path(__file__).resolve().parent / "seed_notes"

SKIP_NAMES = {"CLAUDE.md", "inbox.md", "pending.md", "how-this-works.md", "账号.md", "飞书清单.md",
              "setup-brain-me.sh", "_readme.md", "_standard.md", "交接与复盘指引.md"}
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


# name, kind, docs-producer
LIBRARY: list[tuple[str, str, object]] = [
    # ---------------------------------------------------------------- real
    ("我·档案",           "domain",  lambda: md_files(DEV / "brain_me", ["01-我是谁", "02-经历"])),
    ("人·认识的人",       "domain",  lambda: md_files(DEV / "brain_me", ["03-人"])),
    ("机会·申请与规划",   "project", lambda: md_files(DEV / "brain_me", ["04-机会"])),
    ("研究·AI 音乐检测",  "reading", lambda: md_files(DEV / "brain_ai_base")),
    ("研究·荣誉论文",     "project", lambda: md_files(DEV / "brain_honors-thesis")),
    ("写作·Manifesto",    "project", lambda: md_files(DEV / "brain_manifesto")),
    ("项目·Synesthesia",  "project", lambda: md_files(HOME / "seeingmusic", ["docs"]) +
                                            [("README.md", (HOME / "seeingmusic" / "README.md").read_text())
                                             if (HOME / "seeingmusic" / "README.md").exists() else ("", "")][:1]
                                            if (HOME / "seeingmusic").exists() else []),
    ("产品·副脑",         "project", lambda: [(f.name, FRONT.sub("", f.read_text(), count=1))
                                            for f in [HOME / "Desktop" / "副脑群平台_ProjectStatement_v0.2.md",
                                                      Path(__file__).resolve().parents[1] / "DEVELOPER_MANUAL.md"]
                                            if f.exists()]),
    # -------------------------------------------------------------- seeded
    ("音乐·鼓与节奏",     "domain",  lambda: md_files(SEEDS / "音乐·鼓与节奏")),
    ("制作·混音与母带",   "domain",  lambda: md_files(SEEDS / "制作·混音与母带")),
    ("生活·烹饪与发酵",   "domain",  lambda: md_files(SEEDS / "生活·烹饪与发酵")),
    ("阅读·城市与交通",   "reading", lambda: md_files(SEEDS / "阅读·城市与交通")),
    ("游戏·规则设计",     "domain",  lambda: md_files(SEEDS / "游戏·规则设计")),
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
