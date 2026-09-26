"""Application-security regression tests: body size limits, CORS origin
policy, security response headers, unknown-field handling, HTML/script
strings staying inert as plain JSON data, rate limiting, and WebSocket
origin checking.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from starlette.websockets import WebSocketDisconnect

from app import config
from app.security import RateLimiter, websocket_origin_allowed

from .helpers import make_event


def test_oversized_payload_rejected(client):
    huge_evidence = {"blob": "x" * (config.MAX_BODY_BYTES + 1)}
    payload = make_event("big-1", "vision", "x", "A", evidence=huge_evidence)
    resp = client.post("/api/events", json=payload)
    assert resp.status_code == 413
    assert resp.json()["detail"]["error"] == "payload_too_large"
    # never even reached validation/storage
    assert client.get("/api/events").json()["count"] == 0


def test_unknown_top_level_fields_are_ignored_not_stored(client):
    payload = make_event("extra-1", "vision", "x", "A")
    payload["totally_unrecognized_field"] = "should be dropped"
    resp = client.post("/api/events", json=payload)
    assert resp.status_code == 201
    stored = resp.json()["event"]
    assert "totally_unrecognized_field" not in stored


def test_html_and_script_strings_remain_inert_plain_data(client):
    hostile = "<script>alert(document.cookie)</script>"
    payload = make_event(
        "xss-1", "vision", hostile, "A",
        attributes={"note": hostile}, evidence={"raw": hostile},
    )
    resp = client.post("/api/events", json=payload)
    assert resp.status_code == 201
    assert resp.headers["content-type"].startswith("application/json")

    event = resp.json()["event"]
    # Round-trips byte-for-byte as a JSON string value -- never
    # interpreted, unescaped into HTML, or used to build a response body
    # outside the JSON envelope.
    assert event["event_type"] == hostile
    assert event["attributes"]["note"] == hostile
    assert event["evidence"]["raw"] == hostile

    fetched = client.get(f"/api/events/{event['event_id']}").json()
    assert fetched["event_type"] == hostile


def test_security_headers_present_on_json_response(client):
    resp = client.get("/api/health")
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["referrer-policy"] == "no-referrer"
    assert resp.headers["x-frame-options"] == "DENY"
    assert "default-src 'none'" in resp.headers["content-security-policy"]


def test_cors_reflects_allowed_origin_only(client):
    allowed = config.ALLOWED_ORIGINS[0]
    ok = client.get("/api/health", headers={"Origin": allowed})
    assert ok.headers.get("access-control-allow-origin") == allowed

    blocked = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert blocked.headers.get("access-control-allow-origin") is None


def test_invalid_incident_id_is_404_not_500(client):
    assert client.get("/api/incidents/does-not-exist").status_code == 404
    assert client.post(
        "/api/incidents/does-not-exist/status", json={"status": "ACKNOWLEDGED"}
    ).status_code == 404


def test_invalid_status_value_rejected(client):
    base = datetime.now(timezone.utc)
    client.post("/api/events", json=make_event("st1", "vision", "x", "LAB-01", zone_id="RESTRICTED-LAB", base_time=base))
    client.post("/api/events", json=make_event("st2", "endpoint", "x", "LAB-01", offset=3, base_time=base))
    r3 = client.post("/api/events", json=make_event("st3", "network", "x", "LAB-01", offset=6, base_time=base))
    incident_id = r3.json()["incident"]["incident_id"]

    bad = client.post(f"/api/incidents/{incident_id}/status", json={"status": "DELETED"})
    assert bad.status_code == 422


def test_websocket_rejects_disallowed_origin_only(client):
    assert websocket_origin_allowed(None) is True
    assert websocket_origin_allowed(config.ALLOWED_ORIGINS[0]) is True
    assert websocket_origin_allowed("https://evil.example") is False

    with client.websocket_connect("/ws", headers={"origin": config.ALLOWED_ORIGINS[0]}) as ws:
        pass  # allowed origin: handshake succeeds

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws", headers={"origin": "https://evil.example"}):
            pass  # disallowed origin: server closes before accept


def test_rate_limiter_blocks_after_threshold_then_recovers():
    limiter = RateLimiter(max_requests=3, window_seconds=10)
    now = 1000.0
    assert limiter.allow("k", now=now) is True
    assert limiter.allow("k", now=now) is True
    assert limiter.allow("k", now=now) is True
    assert limiter.allow("k", now=now) is False  # 4th request in-window: blocked

    # a different key has its own independent budget
    assert limiter.allow("other", now=now) is True

    # once the window rolls past, the key recovers
    assert limiter.allow("k", now=now + 11) is True
