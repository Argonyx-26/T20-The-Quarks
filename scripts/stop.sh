#!/usr/bin/env bash
# Stop processes started by start.sh.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE_DIR="$ROOT/.sentrix_pids"

for name in backend frontend; do
  pidfile="$PIDFILE_DIR/$name.pid"
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" 2>/dev/null
      echo "[STOPPED] $name (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
done
