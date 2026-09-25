#!/usr/bin/env bash
# Thin wrapper: run the health check with the backend's own venv, which
# already carries httpx + websockets (no separate health-check venv needed).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="$ROOT/backend/.venv/bin/python"

if [ ! -x "$PYTHON" ]; then
  echo "[FAIL] backend/.venv not found -- run scripts/start.sh setup first" >&2
  exit 1
fi

exec "$PYTHON" "$ROOT/scripts/health_check.py"
