#!/usr/bin/env bash
# One command to bring the whole demo up.
#   ./run.sh            normal
#   OFFLINE=1 ./run.sh  stage fallback: no network, no keys, mock everything
#
# Needs MongoDB (default mongodb://localhost:27017). Quickest ways to get one:
#   docker compose up -d mongo               (see docker-compose.yml)
#   brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community
# Without one, the backend still starts on an in-memory store — fine for a rehearsal,
# but NOTHING persists across restarts. /api/health tells you which one you are on.
set -euo pipefail
cd "$(dirname "$0")"

export WEAVE_OFFLINE="${OFFLINE:-0}"
export WEAVE_MONGO_URI="${WEAVE_MONGO_URI:-mongodb://localhost:27017}"
export WEAVE_MONGO_DB="${WEAVE_MONGO_DB:-weave}"

PY=""
for c in python3.12 python3.11 python3.10 python3; do
  command -v "$c" >/dev/null 2>&1 && { PY="$c"; break; }
done
[ -n "$PY" ] || { echo "python >= 3.10 required"; exit 1; }

if [ ! -d backend/.venv ]; then
  "$PY" -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
[ -d frontend/node_modules ] || (cd frontend && npm install --no-audit --no-fund)

if backend/.venv/bin/python - <<'PYCHK'
import os, sys
from pymongo import MongoClient
try:
    MongoClient(os.environ["WEAVE_MONGO_URI"], serverSelectionTimeoutMS=1500).admin.command("ping")
except Exception:
    sys.exit(1)
PYCHK
then
  echo "MongoDB ok at $WEAVE_MONGO_URI (db=$WEAVE_MONGO_DB)"
else
  echo "⚠  MongoDB not reachable at $WEAVE_MONGO_URI — running on an IN-MEMORY store."
  echo "   The server seeds itself from demo/seed_notes/ on every start; ideas and"
  echo "   night prefs will NOT survive a restart. For persistence start a mongod:"
  echo "   docker compose up -d mongo   (then re-run ./run.sh)"
fi

# Against a real MongoDB this loads demo/seed_notes/ once. Against the in-memory
# fallback it is a no-op (that store is per-process; the server seeds itself).
(cd backend && .venv/bin/python seed.py) || true
(cd backend && .venv/bin/uvicorn app.main:app --port 8000 --reload) &
BACK=$!
trap 'kill $BACK 2>/dev/null || true' EXIT
(cd frontend && npm run dev)
