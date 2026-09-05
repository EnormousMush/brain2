"""MongoDB access layer — the ONLY module that imports pymongo.

Everything above this file speaks plain dicts: `id` in, `id` out. Keep the
surface tiny; the corpus is a few thousand documents, so we do joins in Python
(`brain_map()`) rather than $lookup, and we keep query shapes simple enough that
the in-memory fallback (mongomock) behaves identically to a real server.

Backends (see config.py):
  * mongodb://...   a real server. Default.
  * mock://         mongomock, in-process, nothing persists. Used by smoke.py when
                    no server is around, and automatically when the server is
                    unreachable (WEAVE_MONGO_FALLBACK=1). We log loudly and expose
                    it on /api/health so nobody demos on a store that forgets.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Iterable

import numpy as np
from bson.binary import Binary

from .config import MONGO_DB, MONGO_FALLBACK, MONGO_URI
from .schema import INDEXES, USER_DATA_COLLECTIONS

log = logging.getLogger("weave.db")

_client = None
_backend = "unset"          # "mongodb" | "memory"


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def nid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


# ------------------------------------------------------------- connection
def _memory_client():
    import mongomock  # dev/test dependency; only imported on this path
    return mongomock.MongoClient()


def client():
    global _client, _backend
    if _client is not None:
        return _client
    if MONGO_URI.startswith("mock"):
        _client, _backend = _memory_client(), "memory"
        return _client
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError

    c = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2500)
    try:
        c.admin.command("ping")
        _client, _backend = c, "mongodb"
    except PyMongoError as e:
        if not MONGO_FALLBACK:
            raise
        log.warning("MongoDB unreachable at %s (%s). Running on an IN-MEMORY store — "
                    "nothing will persist across restarts.", MONGO_URI, e.__class__.__name__)
        _client, _backend = _memory_client(), "memory"
    return _client


def backend() -> str:
    client()
    return _backend


def db():
    return client()[MONGO_DB]


def col(name: str):
    return db()[name]


def init_db() -> None:
    for name, specs in INDEXES.items():
        for keys in specs:
            col(name).create_index(keys)
    migrate()


def migrate() -> None:
    """Idempotent, runs on every boot. `sparks` became `ideas` when 灵光 capture
    was split from debate creation — an old database still has the old shape."""
    if "sparks" not in db().list_collection_names() or count("ideas"):
        return
    moved = 0
    for d in find("sparks"):
        col("ideas").insert_one({
            "_id": d["id"], "text": d.get("text") or "", "origin": "user",
            "kind": "eureka", "status": "kept", "brain_id": None, "image": None,
            "enrichment": "ready" if d.get("status") == "enriched" else "pending",
            "skeleton": d.get("skeleton"), "embedding": d.get("embedding"),
            "hits": d.get("hits") or [], "x": None, "y": None, "z": None,
            "debate_id": None, "created_at": d.get("created_at") or now(),
            "decided_at": None,
        })
        moved += 1
    for d in find("debates", {"spark_id": {"$ne": None}}, fields=["spark_id"]):
        col("debates").update_one({"_id": d["id"]},
                                  {"$set": {"idea_id": d["spark_id"]},
                                   "$unset": {"spark_id": ""}})
    col("sparks").drop()
    log.info("migrated %d sparks -> ideas", moved)


# -------------------------------------------------------- dict <-> document
def _out(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    d = dict(doc)
    d["id"] = d.pop("_id")
    return d


def _in(doc: dict) -> dict:
    d = dict(doc)
    d["_id"] = d.pop("id")
    return d


def find(name: str, flt: dict | None = None, *, sort: list[tuple[str, int]] | None = None,
         limit: int = 0, fields: Iterable[str] | None = None) -> list[dict]:
    proj = {f: 1 for f in fields} if fields else None
    cur = col(name).find(flt or {}, proj)
    if sort:
        cur = cur.sort(sort)
    if limit:
        cur = cur.limit(limit)
    return [_out(d) for d in cur]


def find_one(name: str, flt: dict) -> dict | None:
    return _out(col(name).find_one(flt))


def get(name: str, id_: str | None) -> dict | None:
    if not id_:
        return None
    return find_one(name, {"_id": id_})


def count(name: str, flt: dict | None = None) -> int:
    return col(name).count_documents(flt or {})


def insert(name: str, doc: dict) -> None:
    col(name).insert_one(_in(doc))


def insert_many(name: str, docs: list[dict]) -> None:
    if docs:
        col(name).insert_many([_in(d) for d in docs])


def update(name: str, flt: dict, sets: dict[str, Any]) -> int:
    return col(name).update_many(flt, {"$set": sets}).modified_count


def update_id(name: str, id_: str, sets: dict[str, Any]) -> None:
    col(name).update_one({"_id": id_}, {"$set": sets})


def upsert_id(name: str, id_: str, sets: dict[str, Any]) -> None:
    col(name).update_one({"_id": id_}, {"$set": sets}, upsert=True)


def bulk_set(name: str, items: list[tuple[str, dict[str, Any]]]) -> None:
    """[(id, {field: value})] -> one round trip. Used by layout/cluster passes."""
    if not items:
        return
    if backend() == "memory":     # mongomock lags pymongo's bulk API; plain updates are fine
        c = col(name)
        for i, s in items:
            c.update_one({"_id": i}, {"$set": s})
        return
    from pymongo import UpdateOne
    col(name).bulk_write([UpdateOne({"_id": i}, {"$set": s}) for i, s in items],
                         ordered=False)


def delete(name: str, flt: dict) -> int:
    return col(name).delete_many(flt).deleted_count


# --------------------------------------------- cascades (no FKs in Mongo)
def brain_map() -> dict[str, dict]:
    """id -> brain doc. The Python-side JOIN for anything needing name/color."""
    return {b["id"]: b for b in find("brains")}


def delete_brain(brain_id: str) -> None:
    delete("chunks", {"brain_id": brain_id})
    delete("clusters", {"brain_id": brain_id})
    delete("brains", {"_id": brain_id})


def delete_debate(debate_id: str) -> None:
    delete("turns", {"debate_id": debate_id})
    delete("cards", {"debate_id": debate_id})
    delete("debates", {"_id": debate_id})


def delete_idea(idea_id: str) -> None:
    update("debates", {"idea_id": idea_id}, {"idea_id": None})
    delete("ideas", {"_id": idea_id})


# ---------------------------------------------------------------- settings
# The `settings` collection is a plain key -> {"value": {...}} store. It survives
# 「删除我的副脑」 on purpose: your API keys and your 夜间 preferences are not data.
def read_setting(key: str) -> dict | None:
    return (get("settings", key) or {}).get("value")


def write_setting(key: str, value: dict) -> None:
    upsert_id("settings", key, {"value": value})


# ------------------------------------------------------------- vector blobs
def to_blob(vec: np.ndarray) -> Binary:
    return Binary(np.asarray(vec, dtype="float32").tobytes())


def from_blob(blob: bytes | Binary | None) -> np.ndarray | None:
    if not blob:
        return None
    return np.frombuffer(bytes(blob), dtype="float32")


# ------------------------------------------------------------------ nuke
def wipe_all() -> dict[str, int]:
    """Powers the 「删除我的副脑」 button. Deliberately unrecoverable.
    Drops every user-data collection; provider settings (your keys) survive."""
    counts = {}
    for name in USER_DATA_COLLECTIONS:
        counts[name] = count(name)
        col(name).drop()
    init_db()
    return counts
