"""Load the demo 副脑 from demo/seed_notes/ so a fresh clone has something to show.

    python seed.py                   # uses whatever provider is configured
    WEAVE_OFFLINE=1 python seed.py   # no network, no keys

Needs a reachable MongoDB (WEAVE_MONGO_URI, default mongodb://localhost:27017).
Without one this process seeds its own in-memory store and throws it away on
exit — the server seeds itself in that case (see app/demo_seed.py).
Replace demo/seed_notes/ with your own notes, or import them from the UI.
"""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.db import backend, init_db  # noqa: E402
from app.demo_seed import seed_demo  # noqa: E402


async def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    init_db()
    if backend() == "memory":
        print("MongoDB unreachable — this process would only seed a throwaway in-memory store.\n"
              "The server seeds itself from demo/seed_notes/ on startup instead. Nothing to do.")
        return
    await seed_demo()


if __name__ == "__main__":
    asyncio.run(main())
