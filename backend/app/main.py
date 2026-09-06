import asyncio
import logging
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .api import brains, debates, graph, ideas, night, settings
from .config import CORS_ORIGINS, OFFLINE
from .db import backend, init_db
from .demo_seed import seed_demo
from .night import runner as night_runner

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s | %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    # No mongod → in-memory store, private to THIS process. seed.py can't reach it,
    # so load demo/seed_notes/ here or the 星图 comes up empty every single start.
    if backend() == "memory":
        await seed_demo()
    logging.getLogger("weave").info("ready. offline=%s db=%s", OFFLINE, backend())
    # 夜间发现：一个分钟级的 asyncio 循环，不引入调度器依赖。后端不开机就不跑 ——
    # 对一个完全跑在用户自己机器上的东西，这是诚实的行为。
    task = asyncio.create_task(night_runner.scheduler())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(title="Weave / 副脑", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"],
                   allow_headers=["*"])

app.include_router(brains.router)
app.include_router(graph.router)
app.include_router(ideas.router)
app.include_router(night.router)
app.include_router(debates.router)
app.include_router(debates.cards_router)
app.include_router(settings.router)
app.include_router(settings.privacy)


@app.get("/api/health")
def health():
    return {"ok": True, "offline": OFFLINE, "db": backend()}


# Single-container deploys (ModelScope 创空间, docker) build the frontend into
# frontend/dist and serve it from the same process. Dev keeps using Vite.
_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="ui")
