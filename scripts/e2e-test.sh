#!/usr/bin/env bash
# Real, black-box end-to-end test against a RUNNING SENTRIX backend.
# Does NOT start the backend for you -- run scripts/start.sh first (or your
# own `uvicorn app.main:app --port 8000`). See scripts/test-backend-e2e.py
# for what this actually checks.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"

if ! curl -s --max-time 2 "http://127.0.0.1:8000/api/health" >/dev/null 2>&1; then
  echo "[FAIL] no backend responding on http://127.0.0.1:8000 -- run scripts/start.sh first" >&2
  exit 1
fi

exec "$BACKEND_DIR/.venv/bin/python" "$ROOT/scripts/test-backend-e2e.py" "$@"
