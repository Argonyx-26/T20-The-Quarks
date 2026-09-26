#!/usr/bin/env python3
"""
Real, black-box end-to-end test of device pairing, heartbeat auth,
role-aware realtime, and alert privacy against a RUNNING SENTRIX backend.

Complements scripts/test-backend-e2e.py (events/fusion/incidents) -- this
script is entirely about the P0 device/pairing/notification layer added on
top of that already-verified core.

Usage:
    cd backend && ./.venv/bin/python ../scripts/test-pairing-e2e.py
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone

import httpx
import websockets


def log(stage: str, msg: str = "") -> None:
    print(f"[{stage}] {msg}" if msg else f"[{stage}]")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_event(event_id: str, source: str, event_type: str, asset_id: str, severity=50, confidence=0.7) -> dict:
    return {
        "event_id": event_id, "timestamp": now_iso(), "source": source, "event_type": event_type,
        "asset_id": asset_id, "severity": severity, "confidence": confidence, "attributes": {}, "evidence": {},
    }


class Failure(AssertionError):
    pass


def check(condition: bool, message: str, evidence=None):
    if not condition:
        detail = f"{message}\n  evidence: {json.dumps(evidence, indent=2, default=str)}" if evidence is not None else message
        raise Failure(detail)


async def run(base_url: str, ws_url: str) -> None:
    client = httpx.Client(base_url=base_url, timeout=10.0)

    client.post("/api/demo/reset")

    # -- 1. pairing token lifecycle --------------------------------------
    log("PAIRING CREATE", "POST /api/pairing")
    r = client.post("/api/pairing")
    check(r.status_code == 200, "pairing create did not return 200", r.text)
    pairing = r.json()
    token = pairing["token"]
    check(len(token) >= 20, "pairing token looks too short to be a real secrets.token_urlsafe()", pairing)

    log("PAIRING VALIDATE", f"GET /api/pairing/{token[:8]}...")
    r = client.get(f"/api/pairing/{token}")
    check(r.status_code == 200 and r.json()["valid"] is True, "fresh pairing token not reported valid", r.json())

    log("PAIRING VALIDATE", "unknown token -> 404")
    r = client.get("/api/pairing/does-not-exist-at-all")
    check(r.status_code == 404, "unknown pairing token did not 404", {"status": r.status_code})

    # -- 2. confirm -> real device + credential --------------------------
    log("DEVICE REGISTERED", f"POST /api/pairing/{token[:8]}.../confirm")
    r = client.post(f"/api/pairing/{token}/confirm", json={"display_name": "Phone B (e2e)"})
    check(r.status_code == 200, "pairing confirm rejected", r.text)
    confirm = r.json()
    device_id, device_token = confirm["device_id"], confirm["device_token"]
    check(len(device_token) >= 30, "device_token looks too short to be a real credential", confirm)
    check(confirm["status"] == "ONLINE", "freshly paired device is not ONLINE", confirm)
    log("DEVICE REGISTERED", f"OK -- device_id={device_id}")

    log("PAIRING SINGLE-USE", "re-confirming the SAME token")
    r = client.post(f"/api/pairing/{token}/confirm", json={})
    check(r.status_code == 409, "a used pairing token was accepted a second time", {"status": r.status_code, "body": r.text})
    log("PAIRING SINGLE-USE", "OK -- second confirm rejected (409)")

    # -- 3. device registry ------------------------------------------------
    r = client.get("/api/devices")
    devices = r.json()["devices"]
    check(any(d["device_id"] == device_id for d in devices), "paired device not visible in GET /api/devices", devices)
    log("DEVICE REGISTRY", f"OK -- {len(devices)} real registered device(s)")

    # -- 4. heartbeat auth --------------------------------------------------
    log("HEARTBEAT", "wrong credential -> 401")
    r = client.post(f"/api/devices/{device_id}/heartbeat", headers={"X-Device-Token": "not-the-real-token"})
    check(r.status_code == 401, "heartbeat with wrong credential was not rejected", {"status": r.status_code})

    log("HEARTBEAT", "correct credential -> updates last_seen")
    before = client.get("/api/devices").json()["devices"][0]["last_seen"]
    time.sleep(1.1)
    r = client.post(f"/api/devices/{device_id}/heartbeat", headers={"X-Device-Token": device_token})
    check(r.status_code == 200, "valid heartbeat rejected", r.text)
    after = r.json()["last_seen"]
    check(after != before, "heartbeat did not actually update last_seen", {"before": before, "after": after})
    log("HEARTBEAT", "OK -- authenticated heartbeat updates real state, backend decides status")

    # -- 5. role-aware WebSocket + credential rejection ---------------------
    log("WS AUTH", "paired_device role with bad credential must be rejected")
    try:
        async with websockets.connect(f"{ws_url}?role=paired_device&device_id={device_id}&token=bad-token"):
            raise Failure("bad device credential was accepted by the paired-device socket")
    except Failure:
        raise
    except Exception:
        log("WS AUTH", "OK -- bad credential rejected at handshake")

    # -- 6. privacy: mission_control gets full payloads, phone gets minimal --
    mc_ws = await websockets.connect(ws_url)
    phone_ws = await websockets.connect(f"{ws_url}?role=paired_device&device_id={device_id}&token={device_token}")
    await asyncio.sleep(0.3)

    client.post("/api/events", json=make_event("pairing-e2e-plain-1", "endpoint", "probe", "device-plain", severity=5))
    mc_msgs, phone_msgs = await _drain(mc_ws, 1.5), await _drain(phone_ws, 1.0)
    check(any(m["type"] == "event.created" for m in mc_msgs), "Mission Control did not receive a plain event.created", mc_msgs)
    check(len(phone_msgs) == 0, "paired phone received something for a routine event -- privacy leak", phone_msgs)
    log("PRIVACY", "OK -- routine event.created reaches Mission Control only")

    # -- 7. positive fusion -> qualifying alert reaches the phone -----------
    for src, etype, sev in [("vision", "person_in_restricted_zone", 80), ("endpoint", "credential_reuse_detected", 85), ("network", "unrecognized_device_join", 90)]:
        client.post("/api/events", json=make_event(f"pairing-e2e-pos-{src}", src, etype, "device-pos-alert", severity=sev, confidence=0.9))
        await asyncio.sleep(1.0)

    mc_msgs2, phone_msgs2 = await _drain(mc_ws, 2.0), await _drain(phone_ws, 2.0)
    mc_incident = next((m for m in mc_msgs2 if m["type"] == "incident.created"), None)
    phone_alert = next((m for m in phone_msgs2 if m["type"] == "incident.alert"), None)
    check(mc_incident is not None, "Mission Control did not receive the qualifying incident", mc_msgs2)
    check(phone_alert is not None, "paired phone did not receive incident.alert for a qualifying incident", phone_msgs2)
    leaked = set(phone_alert["data"].keys()) - {"incidentId", "severity", "title", "deviceName", "timestamp"}
    check(not leaked, "incident.alert leaked extra fields to the phone", leaked)
    check(not any(m["type"] == "incident.created" for m in phone_msgs2), "phone received the FULL incident, not just the alert", phone_msgs2)
    log("PRIVACY", f"OK -- qualifying incident reached phone as minimal alert only: {sorted(phone_alert['data'].keys())}")

    # -- 8. negative fusion -> NO alert --------------------------------------
    client.post("/api/demo/reset")
    await _drain(mc_ws, 0.5)
    await _drain(phone_ws, 0.5)

    client.post("/api/events", json=make_event("pairing-e2e-neg-vision", "vision", "loitering", "device-neg-x", severity=40, confidence=0.6))
    client.post("/api/events", json=make_event("pairing-e2e-neg-endpoint", "endpoint", "suspicious_process", "device-neg-y", severity=45, confidence=0.55))
    client.post("/api/events", json=make_event("pairing-e2e-neg-network", "network", "port_scan", "device-neg-x", severity=50, confidence=0.5))
    await asyncio.sleep(0.5)

    mc_msgs3, phone_msgs3 = await _drain(mc_ws, 1.5), await _drain(phone_ws, 1.5)
    check(not any(m["type"] == "incident.created" for m in mc_msgs3), "mismatch scenario incorrectly created an incident", mc_msgs3)
    check(len(phone_msgs3) == 0, "phone received an alert for a scenario that created NO incident", phone_msgs3)
    log("NO INCIDENT / NO ALERT", "OK -- mismatch produced neither an incident nor a phone alert")

    await mc_ws.close()
    await phone_ws.close()
    client.close()
    print("\nALL PAIRING/PRIVACY STAGES PASSED")


async def _drain(ws, timeout: float) -> list[dict]:
    msgs = []
    try:
        while True:
            raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
            msgs.append(json.loads(raw))
    except asyncio.TimeoutError:
        pass
    return msgs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--ws-url", default="ws://127.0.0.1:8000/ws")
    args = parser.parse_args()

    start = time.time()
    try:
        asyncio.run(run(args.base_url, args.ws_url))
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
