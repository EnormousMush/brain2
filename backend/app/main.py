import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import brains, debates, graph, ideas, night, settings
from .config import CORS_ORIGINS, OFFLINE
from .db import backend, init_db
from .night import runner as night_runner

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s | %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
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
