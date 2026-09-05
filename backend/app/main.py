import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import brains, debates, graph, settings, sparks
from .config import CORS_ORIGINS, OFFLINE
from .db import backend, init_db

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s | %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logging.getLogger("weave").info("ready. offline=%s db=%s", OFFLINE, backend())
    yield


app = FastAPI(title="Weave / 副脑", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"],
                   allow_headers=["*"])

app.include_router(brains.router)
app.include_router(graph.router)
app.include_router(sparks.router)
app.include_router(debates.router)
app.include_router(debates.cards_router)
app.include_router(settings.router)
app.include_router(settings.privacy)


@app.get("/api/health")
def health():
    return {"ok": True, "offline": OFFLINE, "db": backend()}
