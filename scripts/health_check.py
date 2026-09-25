#!/usr/bin/env python3
"""SENTRIX health check.

Verifies, in order: backend reachable -> event ingestion -> fusion
responding -> realtime (/ws) reachable -> frontend reachable (if present)
-> per-sensor last-seen status from the backend's own bookkeeping.

Exit code 0 only if every REQUIRED check passes. Sensors are optional --
a never-seen sensor prints [DEGRADED] with a replay fallback note rather
than failing the whole check, matching the "optional sensor fails ->
DEGRADED, not FAIL" contract.

Run with the backend's own venv, which already has httpx + websockets:
    backend/.venv/bin/python scripts/health_check.py
"""
from __future__ import annotations

import asyncio
import os
import sys

import httpx

BACKEND_URL = os.environ.get("SENTRIX_BACKEND_URL", "http://127.0.0.1:8000")


def _discover_frontend_url() -> str:
    """Prefer the URL scripts/start.sh actually recorded (it reads vite's own
    log, so it's correct even when vite fell back to a non-default port
    because something unrelated was already squatting on it). Falls back to
    an env var, then to vite's documented default.

    NOTE: Vite's dev server binds the hostname "localhost" by default, which
    on some machines resolves to the IPv6 loopback (::1) only -- a plain
    "http://127.0.0.1:5173" then gets connection-refused even though the
    frontend is genuinely up. Use "localhost" in the fallback, not IPv4.
    """
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    recorded = os.path.join(root, ".sentrix_pids", "frontend_url")
    if os.path.exists(recorded):
        with open(recorded, "r", encoding="utf-8") as fh:
            url = fh.read().strip()
            if url:
                return url.rstrip("/")
    return os.environ.get("SENTRIX_FRONTEND_URL", "http://localhost:5173")


FRONTEND_URL = _discover_frontend_url()

OK = "\033[32m[OK]\033[0m"
DEGRADED = "\033[33m[DEGRADED]\033[0m"
FAIL = "\033[31m[FAIL]\033[0m"
SKIP = "\033[90m[SKIP]\033[0m"


async def check_backend(client: httpx.AsyncClient) -> tuple[bool, dict]:
    try:
        resp = await client.get(f"{BACKEND_URL}/api/health", timeout=5)
        resp.raise_for_status()
        return True, resp.json()
    except Exception as exc:
        print(f"{FAIL} Backend ({exc})")
        return False, {}


async def check_ingestion_and_fusion(client: httpx.AsyncClient) -> bool:
    """Round-trip a throwaway event through the real ingestion pipeline and
    confirm it comes back out of /api/events -- proves ingestion, storage,
    and the fusion evaluation call all actually execute, not just that the
    process is up."""
    import uuid
    from datetime import datetime, timezone

    probe_id = f"healthcheck-{uuid.uuid4().hex[:8]}"
    payload = {
        "event_id": probe_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "network",
        "event_type": "healthcheck_probe",
        "asset_id": "HEALTHCHECK",
        "severity": 1,
        "confidence": 0.01,
        "attributes": {},
        "evidence": {},
    }
    try:
        resp = await client.post(f"{BACKEND_URL}/api/events", json=payload, timeout=5)
        resp.raise_for_status()
        body = resp.json()
        fetched = await client.get(f"{BACKEND_URL}/api/events/{probe_id}", timeout=5)
        fetched.raise_for_status()
        ok = fetched.json().get("event_id") == probe_id and "incident_created" in body
        print(f"{OK if ok else FAIL} Event ingestion + fusion round-trip")
        return ok
    except Exception as exc:
        print(f"{FAIL} Event ingestion + fusion ({exc})")
        return False


async def check_realtime() -> bool:
    try:
        import websockets

        ws_url = BACKEND_URL.replace("http://", "ws://").replace("https://", "wss://") + "/ws"
        async with websockets.connect(ws_url, open_timeout=5) as ws:
            await ws.close()
        print(f"{OK} Realtime (/ws)")
        return True
    except Exception as exc:
        print(f"{FAIL} Realtime ({exc})")
        return False


async def check_frontend(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(FRONTEND_URL, timeout=3)
        if resp.status_code < 500:
            print(f"{OK} Frontend ({FRONTEND_URL})")
        else:
            print(f"{DEGRADED} Frontend returned {resp.status_code}")
    except Exception:
        print(f"{SKIP} Frontend not reachable at {FRONTEND_URL} (may not be running/built yet)")


def print_sensor_status(health_body: dict) -> None:
    sensors = health_body.get("sensors", {})
    for name in sorted(sensors):
        info = sensors[name]
        status = info.get("status")
        if status == "ok":
            print(f"{OK} Sensor:{name} (last_seen {info.get('last_seen')})")
        elif status == "never_seen":
            print(f"{DEGRADED} Sensor:{name} never seen -- replay fallback available")
        else:
            print(f"{DEGRADED} Sensor:{name} stale (age {info.get('age_seconds')}s) -- replay fallback available")


async def main() -> int:
    async with httpx.AsyncClient() as client:
        backend_ok, health_body = await check_backend(client)
        if not backend_ok:
            print(f"{FAIL} SENTRIX NOT READY -- backend unreachable, stopping further checks")
            return 1
        print(f"{OK} Backend ({BACKEND_URL})")

        ingestion_ok = await check_ingestion_and_fusion(client)
        realtime_ok = await check_realtime()
        await check_frontend(client)
        print_sensor_status(health_body)

    required_ok = backend_ok and ingestion_ok and realtime_ok
    print()
    if required_ok:
        print("SENTRIX READY")
        return 0
    print("SENTRIX NOT READY -- see [FAIL] lines above")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
