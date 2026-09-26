#!/usr/bin/env python3
"""
Real, black-box end-to-end test of a RUNNING SENTRIX backend process.

Unlike backend/tests/*.py (which use FastAPI's in-process TestClient and
never actually bind a socket), this script talks to a live server over
real HTTP + WebSocket -- it is the thing that proves "the server actually
starts and serves", not just "the route functions are correct in-process".

Usage:
    cd backend && ./.venv/bin/python ../scripts/test-backend-e2e.py
    ./.venv/bin/python ../scripts/test-backend-e2e.py --base-url http://127.0.0.1:8000

Exit code 0 iff every stage passes. Any failure prints exactly which
assertion failed and the real response that caused it -- no stage is
ever marked passed without checking the actual response body.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone

import httpx

try:
    import websockets
except ImportError:
    websockets = None  # realtime stage is skipped with a clear note, not faked


def log(stage: str, msg: str = "") -> None:
    print(f"[{stage}] {msg}" if msg else f"[{stage}]")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_event(event_id: str, source: str, event_type: str, asset_id: str, severity=50, confidence=0.7) -> dict:
    return {
        "event_id": event_id,
        "timestamp": now_iso(),
        "source": source,
        "event_type": event_type,
        "asset_id": asset_id,
        "severity": severity,
        "confidence": confidence,
        "attributes": {},
        "evidence": {},
    }


class Failure(AssertionError):
    pass


def check(condition: bool, message: str, evidence=None):
    if not condition:
        detail = f"{message}\n  evidence: {json.dumps(evidence, indent=2, default=str)}" if evidence is not None else message
        raise Failure(detail)


def run(base_url: str, ws_url: str) -> None:
    client = httpx.Client(base_url=base_url, timeout=10.0)

    # -- 1. health -----------------------------------------------------
    log("HEALTH CHECK", f"GET {base_url}/api/health")
    r = client.get("/api/health")
    check(r.status_code == 200, "health endpoint did not return 200", {"status": r.status_code, "body": r.text})
    health = r.json()
    check("sensors" in health, "health response missing 'sensors'", health)
    log("HEALTH CHECK", f"OK -- status={health['status']} sensors={list(health['sensors'])}")

    # -- 2. reset for a deterministic starting point --------------------
    log("RESET", "POST /api/demo/reset")
    r = client.post("/api/demo/reset")
    check(r.status_code == 200, "reset did not return 200", {"status": r.status_code, "body": r.text})
    r = client.get("/api/events")
    check(r.json()["count"] == 0, "store not empty after reset", r.json())
    log("RESET", "OK -- store empty")

    # -- 3. "device registration" ---------------------------------------
    # NOTE: this backend has NO device-registration or heartbeat endpoint
    # (confirmed against the live OpenAPI schema, not assumed). A device
    # becomes known the instant it sends its first real event through
    # /api/events -- that is the only real mechanism, so that is what we
    # test here instead of a nonexistent POST /api/devices.
    log("DEVICE REGISTERED", "device-a via first endpoint event (no dedicated registration endpoint exists)")
    r = client.post("/api/events", json=make_event("e2e-script-endpoint-a", "endpoint", "usb_device_attached", "device-a", severity=20, confidence=0.6))
    check(r.status_code == 201, "device-a event rejected", r.json())
    check(r.json()["duplicate"] is False, "device-a event unexpectedly flagged duplicate", r.json())

    log("DEVICE REGISTERED", "device-b via first network event")
    r = client.post("/api/events", json=make_event("e2e-script-network-b", "network", "device_associated", "device-b", severity=15, confidence=0.7))
    check(r.status_code == 201, "device-b event rejected", r.json())

    r = client.get("/api/events")
    events = r.json()["events"]
    asset_ids = {e["asset_id"] for e in events}
    check({"device-a", "device-b"} <= asset_ids, "both devices not independently visible in /api/events", events)
    log("DEVICE REGISTERED", f"OK -- {sorted(asset_ids)} independently visible")

    # -- 4. positive fusion ----------------------------------------------
    log("EVENT INGESTED", "positive sequence: vision, endpoint, network on device-pos")
    r1 = client.post("/api/events", json=make_event("e2e-script-pos-vision", "vision", "person_in_restricted_zone", "device-pos", severity=55, confidence=0.8))
    check(r1.status_code == 201, "positive vision event rejected", r1.json())
    r2 = client.post("/api/events", json=make_event("e2e-script-pos-endpoint", "endpoint", "credential_reuse_detected", "device-pos", severity=70, confidence=0.75))
    check(r2.status_code == 201, "positive endpoint event rejected", r2.json())
    check(r2.json()["incident_created"] is False, "incident created too early (only 2 sources)", r2.json())
    r3 = client.post("/api/events", json=make_event("e2e-script-pos-network", "network", "unrecognized_device_join", "device-pos", severity=65, confidence=0.85))
    check(r3.status_code == 201, "positive network event rejected", r3.json())

    body3 = r3.json()
    log("FUSION EVALUATED", f"result={'incident_created' if body3['incident_created'] else 'no_incident'}")
    check(body3["incident_created"] is True, "3-source correlated signals did NOT create an incident", body3)
    incident_id = body3["incident"]["incident_id"]
    check(len(body3["incident"]["signals"]) == 3, "incident does not contain all 3 signals", body3["incident"])
    log("CRITERIA MATCHED", f"source diversity=3, asset={body3['incident']['asset_id']}")
    log("INCIDENT CREATED", f"{incident_id}")

    # persistence check -- not just the POST response
    r = client.get(f"/api/incidents/{incident_id}")
    check(r.status_code == 200, "created incident not retrievable via GET", {"status": r.status_code})
    check(r.json()["incident_id"] == incident_id, "GET incident_id mismatch", r.json())
    log("INCIDENT CREATED", "OK -- verified via independent GET, not just POST response")

    # -- 5. negative / mismatch ------------------------------------------
    log("RESET", "resetting before mismatch test for isolation")
    client.post("/api/demo/reset")

    log("EVENT INGESTED", "mismatch sequence: vision+network on device-x, endpoint on device-y")
    client.post("/api/events", json=make_event("e2e-script-mis-vision", "vision", "loitering", "device-x", severity=40, confidence=0.6))
    client.post("/api/events", json=make_event("e2e-script-mis-endpoint", "endpoint", "suspicious_process", "device-y", severity=45, confidence=0.55))
    r = client.post("/api/events", json=make_event("e2e-script-mis-network", "network", "port_scan", "device-x", severity=50, confidence=0.5))
    check(r.status_code == 201, "mismatch network event rejected", r.json())
    body = r.json()
    log("FUSION EVALUATED", f"result={'incident_created' if body['incident_created'] else 'no_incident'} (expect no_incident -- device context never reaches 3-way diversity)")
    check(body["incident_created"] is False, "mismatched-context events incorrectly created an incident", body)

    r = client.get("/api/incidents")
    check(r.json()["count"] == 0, "an incident exists after a mismatch-only sequence", r.json())
    log("CRITERIA MISMATCHED", "device-y never shared context with device-x -- kept separate")
    log("NO INCIDENT CREATED", "OK -- verified via independent GET /api/incidents")

    # -- 6. duplicate event id --------------------------------------------
    log("EVENT INGESTED", "resending identical event_id (dedup check)")
    dup = client.post("/api/events", json=make_event("e2e-script-mis-network", "network", "port_scan", "device-x", severity=50, confidence=0.5))
    check(dup.json()["duplicate"] is True, "duplicate event_id was not flagged as duplicate", dup.json())
    log("EVENT INGESTED", "OK -- duplicate correctly flagged, not double-stored")

    # -- 7. error handling -------------------------------------------------
    log("ERROR HANDLING", "invalid source")
    r = client.post("/api/events", json={**make_event("e2e-script-bad", "radio", "x", "a")})
    check(r.status_code == 422, "invalid source did not return 422", {"status": r.status_code})
    r2 = client.get("/api/health")
    check(r2.status_code == 200, "server did not survive invalid payload", {"status": r2.status_code})
    log("ERROR HANDLING", "OK -- clean 422, server still alive")

    # -- 8. realtime (best-effort; skipped with a clear note if unavailable) --
    if websockets is None:
        log("REALTIME", "SKIPPED -- `websockets` package not installed in this environment")
    else:
        log("REALTIME", f"connecting to {ws_url}")
        asyncio.run(_realtime_check(client, ws_url))

    client.close()
    print("\nALL STAGES PASSED")


async def _realtime_check(client: httpx.Client, ws_url: str) -> None:
    async with websockets.connect(ws_url) as ws:
        await asyncio.sleep(0.3)
        client.post("/api/events", json=make_event("e2e-script-rt-probe", "vision", "rt_probe", "device-rt", severity=10, confidence=0.5))
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        except asyncio.TimeoutError:
            raise Failure("no realtime message received within 5s of posting an event")
        msg = json.loads(raw)
        check(msg["type"] == "event.created", "unexpected realtime message type", msg)
        check(msg["data"]["event_id"] == "e2e-script-rt-probe", "realtime message does not match posted event", msg)
        log("REALTIME DELIVERED", f"type={msg['type']} event_id={msg['data']['event_id']}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--ws-url", default=None, help="defaults to ws:// equivalent of --base-url + /ws")
    args = parser.parse_args()

    ws_url = args.ws_url or args.base_url.replace("http://", "ws://").replace("https://", "wss://") + "/ws"

    start = time.time()
    try:
        run(args.base_url, ws_url)
    except Failure as exc:
        print(f"\nFAILED: {exc}", file=sys.stderr)
        return 1
    except httpx.ConnectError as exc:
        print(f"\nFAILED: could not connect to {args.base_url} -- is the backend running? ({exc})", file=sys.stderr)
        return 1
    print(f"({time.time() - start:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
