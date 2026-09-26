#!/usr/bin/env bash
# Start the SENTRIX backend (and frontend, if it exists yet).
# Safe to re-run: reuses a process we already started, and verifies a port
# that looks "already in use" is actually SENTRIX before trusting it --
# not just any process that happens to be listening there (a stray dev
# server from an unrelated project is a real failure mode on a laptop with
# lots of projects open; see scripts/health.sh / .sentrix_frontend_url).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
PIDFILE_DIR="$ROOT/.sentrix_pids"
mkdir -p "$PIDFILE_DIR"

BACKEND_PORT="${SENTRIX_BACKEND_PORT:-8000}"
FRONTEND_PORT_HINT="${SENTRIX_FRONTEND_PORT:-5173}"

port_in_use() {
  lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1
}

pid_alive() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" >/dev/null 2>&1
}

# -- backend ------------------------------------------------------------

backend_looks_like_sentrix() {
  curl -s --max-time 2 "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null | grep -q '"sensors"'
}

if port_in_use "$BACKEND_PORT" && backend_looks_like_sentrix; then
  echo "[OK] backend already running on :$BACKEND_PORT"
elif port_in_use "$BACKEND_PORT"; then
  echo "[FAIL] port :$BACKEND_PORT is occupied by something that is NOT the SENTRIX backend -- set SENTRIX_BACKEND_PORT to use a different port" >&2
  exit 1
else
  if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo "[FAIL] backend/.venv not found -- run: python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt" >&2
    exit 1
  fi
  echo "[START] backend on :$BACKEND_PORT"
  (
    cd "$BACKEND_DIR" && \
    exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" \
      > "$ROOT/.sentrix_backend.log" 2>&1
  ) &
  echo $! > "$PIDFILE_DIR/backend.pid"
  for _ in $(seq 1 20); do
    port_in_use "$BACKEND_PORT" && break
    sleep 0.5
  done
  if port_in_use "$BACKEND_PORT"; then
    echo "[OK] backend up on :$BACKEND_PORT (log: .sentrix_backend.log)"
  else
    echo "[FAIL] backend did not come up -- check .sentrix_backend.log" >&2
    exit 1
  fi
fi

# -- frontend -------------------------------------------------------------
# Vite auto-picks the next free port if its default is taken by an
# unrelated process, so we don't assume the port -- we read it back out of
# vite's own startup log and record it for scripts/health.sh to consume.

FRONTEND_URL_FILE="$PIDFILE_DIR/frontend_url"

# Someone else (another agent/terminal) may already have a vite dev server
# running for this exact frontend/ directory, on whatever port it picked.
# Detect that by matching process cwd -- do NOT launch a second one on top
# of it; that would fight over HMR/file watching with whoever started it.
find_existing_frontend_url() {
  for pid in $(pgrep -f "vite" 2>/dev/null); do
    cwd="$(lsof -p "$pid" 2>/dev/null | awk '$4=="cwd" {print $NF}')"
    if [ "$cwd" = "$FRONTEND_DIR" ]; then
      port="$(lsof -p "$pid" -a -i -sTCP:LISTEN 2>/dev/null | awk '/TCP/ {print $(NF-1)}' | sed -E 's/.*:([0-9]+)$/\1/' | head -1)"
      [ -n "$port" ] && echo "http://localhost:$port/" && return 0
    fi
  done
  return 1
}

if [ -f "$FRONTEND_DIR/package.json" ]; then
  existing_url="$(find_existing_frontend_url || true)"
  if pid_alive "$PIDFILE_DIR/frontend.pid" && [ -f "$FRONTEND_URL_FILE" ]; then
    echo "[OK] frontend already running ($(cat "$FRONTEND_URL_FILE"))"
  elif [ -n "$existing_url" ]; then
    echo "$existing_url" > "$FRONTEND_URL_FILE"
    echo "[OK] frontend already running by another process ($existing_url) -- not starting a duplicate"
  else
    echo "[START] frontend (requesting :$FRONTEND_PORT_HINT, vite may pick another if that's taken)"
    rm -f "$ROOT/.sentrix_frontend.log"
    (
      cd "$FRONTEND_DIR" && \
      exec npm run dev -- --host --port "$FRONTEND_PORT_HINT" \
        > "$ROOT/.sentrix_frontend.log" 2>&1
    ) &
    echo $! > "$PIDFILE_DIR/frontend.pid"

    frontend_url=""
    for _ in $(seq 1 40); do
      frontend_url="$(grep -o 'Local:.*http://[^ ]*' "$ROOT/.sentrix_frontend.log" 2>/dev/null | grep -o 'http://[^ ]*' | head -1)"
      [ -n "$frontend_url" ] && break
      sleep 0.5
    done

    if [ -n "$frontend_url" ]; then
      echo "$frontend_url" > "$FRONTEND_URL_FILE"
      if [ "$frontend_url" != "http://localhost:$FRONTEND_PORT_HINT/" ]; then
        echo "[OK] frontend up at $frontend_url (NOTE: :$FRONTEND_PORT_HINT was already taken by another process -- vite picked a different port)"
      else
        echo "[OK] frontend up at $frontend_url"
      fi
    else
      echo "[FAIL] frontend did not report a URL -- check .sentrix_frontend.log" >&2
      exit 1
    fi
  fi
else
  echo "[SKIP] frontend not present yet (frontend/package.json missing)"
fi

# -- mac endpoint agent ---------------------------------------------------
if pid_alive "$PIDFILE_DIR/agent.pid"; then
  echo "[OK] mac endpoint agent already running"
else
  echo "[START] mac endpoint agent"
  (
    cd "$ROOT" && \
    exec backend/.venv/bin/python -u sensors/mac_endpoint_agent.py \
      > "$ROOT/.sentrix_agent.log" 2>&1
  ) &
  echo $! > "$PIDFILE_DIR/agent.pid"
  echo "[OK] mac endpoint agent up (log: .sentrix_agent.log)"
fi

# -- usb sensor daemon ----------------------------------------------------
if pid_alive "$PIDFILE_DIR/usb_sensor.pid"; then
  echo "[OK] usb sensor daemon already running"
else
  echo "[START] usb sensor daemon"
  (
    cd "$ROOT" && \
    exec backend/.venv/bin/python -u sensors/usb_sensor_daemon.py \
      > "$ROOT/.sentrix_usb_sensor.log" 2>&1
  ) &
  echo $! > "$PIDFILE_DIR/usb_sensor.pid"
  echo "[OK] usb sensor daemon up (log: .sentrix_usb_sensor.log)"
fi

echo "SENTRIX START COMPLETE"
