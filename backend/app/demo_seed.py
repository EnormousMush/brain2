"""Load the demo 副脑 from demo/seed_notes/ — one folder per 副脑, .md/.txt inside.

Two callers:
  * seed.py           one-off, against a real MongoDB, before uvicorn starts.
  * main.py lifespan  in-process, whenever the store is the IN-MEMORY fallback.

The second one is the reason this lives inside `app/`: mongomock is per-process,
so a seed.py run seeds *its own* throwaway store and exits — uvicorn then boots
on an empty one. Without a mongod, the only store that counts is the server's.
"""
import logging
from pathlib import Path

from .db import backend, count, insert, nid, now
from .indexing.layout import layout_all
from .ingest.pipeline import ingest_documents

log = logging.getLogger("weave.seed")

SEED_DIR = Path(__file__).resolve().parents[2] / "demo" / "seed_notes"
COLORS = ["#7aa2f7", "#f7768e", "#9ece6a", "#e0af68", "#bb9af7", "#7dcfff"]


async def seed_demo(*, seed_dir: Path = SEED_DIR) -> bool:
    """Idempotent: does nothing when any 副脑 already exists. Returns True if it seeded."""
    log.info("db backend: %s", backend())
    if count("brains"):
        log.info("brains already exist — skipping seed "
                 "(DELETE /api/privacy/all or drop the Mongo database to reseed)")
        return False
    folders = sorted(p for p in seed_dir.iterdir() if p.is_dir()) if seed_dir.is_dir() else []
    if not folders:
        log.warning("no folders under %s — nothing to seed", seed_dir)
        return False
    for i, folder in enumerate(folders):
        bid = nid("brn")
        insert("brains", dict(id=bid, name=folder.name, kind="domain",
                              color=COLORS[i % len(COLORS)], source="seed", provider=None,
                              model=None, persona=None, chunk_count=0, created_at=now()))
        docs = [(f.name, f.read_text(encoding="utf-8"))
                for f in folder.rglob("*") if f.suffix in {".md", ".txt"}]
        stats = await ingest_documents(bid, docs)
        log.info("  %s: %s", folder.name, stats)
    layout_all()
    log.info("seeded %d 副脑 from %s", len(folders), seed_dir)
    return True
