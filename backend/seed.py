"""Load the demo 副脑 from demo/seed_notes/ so a fresh clone has something to show.

    python seed.py                   # uses whatever provider is configured
    WEAVE_OFFLINE=1 python seed.py   # no network, no keys

Needs a reachable MongoDB (WEAVE_MONGO_URI, default mongodb://localhost:27017).
Replace demo/seed_notes/ with your OWN notes before the 路演. Real notes are the
cheapest and most convincing evidence you have; fake data is visible instantly.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.db import backend, count, init_db, insert, nid, now  # noqa: E402
from app.indexing.layout import layout_all  # noqa: E402
from app.ingest.pipeline import ingest_documents  # noqa: E402

SEED_DIR = Path(__file__).resolve().parents[1] / "demo" / "seed_notes"
COLORS = ["#7aa2f7", "#f7768e", "#9ece6a", "#e0af68", "#bb9af7", "#7dcfff"]


async def main():
    init_db()
    print(f"db backend: {backend()}")
    if count("brains"):
        print("brains already exist — skipping seed "
              "(DELETE /api/privacy/all or drop the Mongo database to reseed)")
        return
    folders = sorted(p for p in SEED_DIR.iterdir() if p.is_dir())
    if not folders:
        print(f"no folders under {SEED_DIR}")
        return
    for i, folder in enumerate(folders):
        bid = nid("brn")
        insert("brains", dict(id=bid, name=folder.name, kind="domain",
                              color=COLORS[i % len(COLORS)], source="seed", provider=None,
                              model=None, persona=None, chunk_count=0, created_at=now()))
        docs = [(f.name, f.read_text(encoding="utf-8"))
                for f in folder.rglob("*") if f.suffix in {".md", ".txt"}]
        stats = await ingest_documents(bid, docs)
        print(f"  {folder.name}: {stats}")
    layout_all()
    print("seeded.")


if __name__ == "__main__":
    asyncio.run(main())
