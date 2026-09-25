#!/usr/bin/env bash
# One-command demo reset: clears events/incidents/fusion state via the
# backend's own /api/demo/reset route. No manual database surgery.
set -uo pipefail

BACKEND_URL="${SENTRIX_BACKEND_URL:-http://127.0.0.1:8000}"

resp="$(curl -s -w '\n%{http_code}' -X POST "$BACKEND_URL/api/demo/reset")"
code="$(echo "$resp" | tail -1)"
body="$(echo "$resp" | sed '$d')"

if [ "$code" = "200" ]; then
  echo "[OK] SENTRIX reset: $body"
else
  echo "[FAIL] reset failed (http $code): $body" >&2
  exit 1
fi
