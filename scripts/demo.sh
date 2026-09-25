#!/usr/bin/env bash
# Deterministic judge demo: clean reset -> positive correlation scenario
# (expect an incident) -> negative scenario (expect no incident, "judge
# gold"). Replay goes through /api/demo/replay, the exact same ingestion +
# fusion pipeline live sensors use -- there is no separate fake demo path.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="${SENTRIX_BACKEND_URL:-http://127.0.0.1:8000}"
NEGATIVE_SCENARIO="${1:-asset_mismatch}"

echo "== 1/4 Reset =="
"$ROOT/scripts/reset.sh"

echo
echo "== 2/4 Positive correlation (expect: incident created) =="
curl -s -X POST "$BACKEND_URL/api/demo/replay/positive_correlation?live=true&speed=4" | python3 -m json.tool

echo
echo "== 3/4 Incident detail =="
curl -s "$BACKEND_URL/api/incidents" | python3 -m json.tool

echo
echo "== 4/4 Negative case: $NEGATIVE_SCENARIO (expect: no incident -- judge gold) =="
"$ROOT/scripts/reset.sh" >/dev/null
curl -s -X POST "$BACKEND_URL/api/demo/replay/$NEGATIVE_SCENARIO?live=true&speed=4" | python3 -m json.tool

echo
echo "DEMO COMPLETE"
