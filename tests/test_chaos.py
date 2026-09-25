"""Chaos / resilience tests -- the "REQUIRED TEST CASES" list from the
SENTRIX command brief: malformed event, duplicate event, stale event,
missing sensor, asset/zone mismatch (covered in test_pipeline.py),
out-of-order events, reset-during-incident, and frontend-refresh-equivalent
(incident remains fetchable after the fact).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from .conftest import make_event


def test_malformed_event_rejected_cleanly(client: httpx.Client):
    resp = client.post("/api/events", json={"not": "an event"})
    assert resp.status_code == 422
    body = resp.json()["detail"]
    assert body["error"] == "invalid_event"
    assert len(body["fields"]) > 0


def test_malformed_event_wrong_types_rejected(client: httpx.Client):
    bad = make_event("vision", "LAB-01")
    bad["severity"] = "not-a-number"
    resp = client.post("/api/events", json=bad)
    assert resp.status_code == 422


def test_malformed_event_unknown_source_rejected(client: httpx.Client):
    bad = make_event("vision", "LAB-01")
    bad["source"] = "carrier_pigeon"
    resp = client.post("/api/events", json=bad)
    assert resp.status_code == 422


def test_duplicate_event_no_double_contribution(client: httpx.Client):
    base = {"asset_id": "LAB-01"}
    v = make_event("vision", zone_id="RESTRICTED-LAB", event_id="dup-v", **base)
    e = make_event("endpoint", event_id="dup-e", **base)
    n = make_event("network", event_id="dup-n", **base)

    client.post("/api/events", json=v)
    client.post("/api/events", json=e)
    first = client.post("/api/events", json=n).json()
    assert first["incident_created"] is True
    incident_id = first["incident"]["incident_id"]
    signal_count = len(first["incident"]["signals"])

    replay = client.post("/api/events", json=n)  # exact same event_id again
    assert replay.json()["duplicate"] is True

    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert len(incident["signals"]) == signal_count, "duplicate event must not double-count"


def test_stale_event_rejected(client: httpx.Client):
    ancient = make_event(
        "network", "LAB-01",
        timestamp=datetime.now(timezone.utc) - timedelta(days=2),
    )
    resp = client.post("/api/events", json=ancient)
    assert resp.status_code == 422


def test_future_timestamp_event_rejected(client: httpx.Client):
    future = make_event(
        "network", "LAB-01",
        timestamp=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    resp = client.post("/api/events", json=future)
    assert resp.status_code == 422


def test_missing_sensor_reported_never_seen_not_fatal(client: httpx.Client):
    """No vision events at all -- health must degrade gracefully, not fail
    the whole system."""
    client.post("/api/events", json=make_event("network", "LAB-01"))
    health = client.get("/api/health").json()
    assert health["status"] == "ok"
    assert health["sensors"]["vision"]["status"] == "never_seen"


def test_out_of_order_events_still_correlate(client: httpx.Client):
    """Network event (logically 'last') arrives first over the wire; vision
    arrives last. Correlation is based on event timestamps, not arrival
    order, so this must still fuse into one incident."""
    now = datetime.now(timezone.utc)
    base = {"asset_id": "LAB-01"}

    network_first = make_event("network", timestamp=now, event_id="ooo-n", **base)
    endpoint_second = make_event("endpoint", timestamp=now - timedelta(seconds=5), event_id="ooo-e", **base)
    vision_last_arrival = make_event(
        "vision", timestamp=now - timedelta(seconds=10), zone_id="RESTRICTED-LAB", event_id="ooo-v", **base
    )

    client.post("/api/events", json=network_first)
    client.post("/api/events", json=endpoint_second)
    resp = client.post("/api/events", json=vision_last_arrival)

    assert resp.json()["incident_created"] is True
    assert len(resp.json()["incident"]["signals"]) == 3


def test_reset_during_open_incident_returns_clean_state(client: httpx.Client):
    base = {"asset_id": "LAB-01"}
    client.post("/api/events", json=make_event("vision", zone_id="RESTRICTED-LAB", **base))
    client.post("/api/events", json=make_event("endpoint", **base))
    client.post("/api/events", json=make_event("network", **base))
    assert client.get("/api/incidents").json()["count"] == 1

    reset_resp = client.post("/api/demo/reset")
    assert reset_resp.status_code == 200

    assert client.get("/api/incidents").json()["count"] == 0
    assert client.get("/api/events").json()["count"] == 0
    health = client.get("/api/health").json()
    assert health["event_count"] == 0
    assert health["open_incident_count"] == 0


def test_incident_survives_refetch(client: httpx.Client):
    """Frontend-refresh equivalent: an incident created earlier must still
    be fully fetchable later in the same server lifetime (no client-side-
    only state)."""
    base = {"asset_id": "LAB-01"}
    client.post("/api/events", json=make_event("vision", zone_id="RESTRICTED-LAB", **base))
    client.post("/api/events", json=make_event("endpoint", **base))
    resp = client.post("/api/events", json=make_event("network", **base))
    incident_id = resp.json()["incident"]["incident_id"]

    refetch1 = client.get(f"/api/incidents/{incident_id}")
    refetch2 = client.get(f"/api/incidents/{incident_id}")
    assert refetch1.json() == refetch2.json()


def test_low_confidence_high_severity_single_source_no_incident(client: httpx.Client):
    """One high-severity event alone must never become an incident on its
    own -- source diversity is the gate, not severity."""
    resp = client.post(
        "/api/events",
        json=make_event("vision", "LAB-01", zone_id="RESTRICTED-LAB", severity=95, confidence=0.99),
    )
    assert resp.json()["incident_created"] is False
    assert client.get("/api/incidents").json()["count"] == 0
