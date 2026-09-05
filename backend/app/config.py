import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("WEAVE_DATA_DIR", ROOT / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------------ MongoDB
# One database, eight collections — see app/schema.py for the document shapes.
#   WEAVE_MONGO_URI       mongodb://localhost:27017 (default) | mongodb+srv://... | mock://
#   WEAVE_MONGO_DB        weave (smoke.py switches to weave_smoke so it never touches demo data)
#   WEAVE_MONGO_FALLBACK  1 (default): if mongod is unreachable, run on an in-memory store
#                         and log a loud warning. 0: fail fast instead.
MONGO_URI = os.getenv("WEAVE_MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("WEAVE_MONGO_DB", "weave")
MONGO_FALLBACK = os.getenv("WEAVE_MONGO_FALLBACK", "1") == "1"

# Set WEAVE_OFFLINE=1 to force the deterministic mock provider everywhere.
# This is the stage fallback: the whole demo runs with no network and no keys.
OFFLINE = os.getenv("WEAVE_OFFLINE", "0") == "1"

EMBED_DIM = int(os.getenv("WEAVE_EMBED_DIM", "512"))   # mock provider dimension
CHUNK_TARGET = 420      # characters, roughly a paragraph
CHUNK_OVERLAP = 60
MAX_RENDER_NODES = 2000  # frontend perf ceiling

CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
