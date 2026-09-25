"""Phase 7 required fusion test cases."""
from datetime import datetime, timezone

from .helpers import make_event


def test_positive_correlation_creates_incident(client):
    base = datetime.now(timezone.utc)
    r1 = client.post("/api/events", json=make_event(
        "v1", "vision", "person_in_restricted_zone", "LAB-01", zone_id="RESTRICTED-LAB",
        severity=55, confidence=0.8, offset=0, base_time=base,
    ))
    assert r1.status_code == 201
    assert r1.json()["incident"] is None

    r2 = client.post("/api/events", json=make_event(
        "e1", "endpoint", "usb_device_attached", "LAB-01",
        severity=60, confidence=0.7, offset=5, base_time=base,
    ))
    assert r2.status_code == 201
    assert r2.json()["incident"] is None

    r3 = client.post("/api/events", json=make_event(
        "n1", "network", "outbound_data_anomaly", "LAB-01",
        severity=70, confidence=0.6, offset=10, base_time=base,
    ))
    assert r3.status_code == 201
    body = r3.json()
    assert body["incident"] is not None
    assert body["incident_created"] is True

    incident = body["incident"]
    assert incident["zone_id"] == "RESTRICTED-LAB"
    assert incident["asset_id"] == "LAB-01"
    assert set(incident["signals"]) == {"v1", "e1", "n1"}
    assert incident["severity"] == 70
    assert 0.0 < incident["confidence"] <= 1.0
    assert len(incident["reasoning"]) > 0

    incidents = client.get("/api/incidents").json()
    assert incidents["count"] == 1


def test_asset_mismatch_no_incident(client):
    base = datetime.now(timezone.utc)
    client.post("/api/events", json=make_event("v2", "vision", "loitering", "LAB-A", offset=0, base_time=base))
    client.post("/api/events", json=make_event("e2", "endpoint", "suspicious_process", "LAB-B", offset=4, base_time=base))
    r3 = client.post("/api/events", json=make_event("n2", "network", "port_scan", "LAB-A", offset=8, base_time=base))

    assert r3.json()["incident"] is None
    assert client.get("/api/incidents").json()["count"] == 0


def test_zone_mismatch_no_incident(client):
    base = datetime.now(timezone.utc)
    client.post("/api/events", json=make_event(
        "v3", "vision", "person_in_restricted_zone", "GATE-CTRL-01", zone_id="PERIMETER", offset=0, base_time=base,
    ))
    client.post("/api/events", json=make_event(
        "e3", "endpoint", "usb_device_attached", "SRV-RACK-01", offset=5, base_time=base,
    ))
    r3 = client.post("/api/events", json=make_event(
        "n3", "network", "outbound_data_anomaly", "SRV-RACK-01", offset=9, base_time=base,
    ))

    assert r3.json()["incident"] is None
    assert client.get("/api/incidents").json()["count"] == 0


def test_time_window_mismatch_no_incident(client):
    from datetime import timedelta
    base = datetime.now(timezone.utc) - timedelta(seconds=650)
    client.post("/api/events", json=make_event("v4", "vision", "person_in_restricted_zone", "LAB-02", zone_id="RESTRICTED-LAB", offset=0, base_time=base))
    client.post("/api/events", json=make_event("e4", "endpoint", "usb_device_attached", "LAB-02", offset=6, base_time=base))
    r3 = client.post("/api/events", json=make_event("n4", "network", "outbound_data_anomaly", "LAB-02", offset=600, base_time=base))

    assert r3.json()["incident"] is None
    assert client.get("/api/incidents").json()["count"] == 0


def test_duplicate_event_is_idempotent(client):
    base = datetime.now(timezone.utc)
    payload = make_event("dup-1", "vision", "person_in_restricted_zone", "LAB-01", zone_id="RESTRICTED-LAB", base_time=base)

    r1 = client.post("/api/events", json=payload)
    assert r1.status_code == 201
    assert r1.json()["duplicate"] is False

    r2 = client.post("/api/events", json=payload)
    assert r2.status_code == 201
    assert r2.json()["duplicate"] is True

    assert client.get("/api/events").json()["count"] == 1

    client.post("/api/events", json=make_event("dup-2", "endpoint", "usb_device_attached", "LAB-01", offset=3, base_time=base))
    client.post("/api/events", json=make_event("dup-3", "network", "outbound_data_anomaly", "LAB-01", offset=6, base_time=base))
    r3 = client.post("/api/events", json=payload)  # re-send original, should not double count in fusion
    assert r3.json()["duplicate"] is True
    assert client.get("/api/incidents").json()["count"] == 1
    incident = client.get("/api/incidents").json()["incidents"][0]
    assert incident["signals"].count("dup-1") == 1


def test_incident_update_on_additional_compatible_event(client):
    base = datetime.now(timezone.utc)
    client.post("/api/events", json=make_event("u1", "vision", "person_in_restricted_zone", "LAB-01", zone_id="RESTRICTED-LAB", offset=0, base_time=base))
    client.post("/api/events", json=make_event("u2", "endpoint", "usb_device_attached", "LAB-01", offset=4, base_time=base))
    r3 = client.post("/api/events", json=make_event("u3", "network", "outbound_data_anomaly", "LAB-01", offset=8, base_time=base))
    incident_id = r3.json()["incident"]["incident_id"]

    r4 = client.post("/api/events", json=make_event("u4", "vision", "person_in_restricted_zone", "LAB-01", zone_id="RESTRICTED-LAB", severity=90, offset=15, base_time=base))
    body = r4.json()
    assert body["incident_created"] is False
    assert body["incident"]["incident_id"] == incident_id
    assert "u4" in body["incident"]["signals"]
    assert body["incident"]["severity"] == 90

    assert client.get("/api/incidents").json()["count"] == 1


def test_malformed_events_rejected_cleanly(client):
    base = datetime.now(timezone.utc).isoformat()

    bad_source = client.post("/api/events", json={
        "event_id": "bad-1", "timestamp": base, "source": "carrier_pigeon",
        "event_type": "x", "asset_id": "A", "severity": 10, "confidence": 0.5,
    })
    assert bad_source.status_code == 422

    bad_severity = client.post("/api/events", json={
        "event_id": "bad-2", "timestamp": base, "source": "vision",
        "event_type": "x", "asset_id": "A", "severity": 999, "confidence": 0.5,
    })
    assert bad_severity.status_code == 422

    bad_confidence = client.post("/api/events", json={
        "event_id": "bad-3", "timestamp": base, "source": "vision",
        "event_type": "x", "asset_id": "A", "severity": 10, "confidence": 5.0,
    })
    assert bad_confidence.status_code == 422

    bad_timestamp = client.post("/api/events", json={
        "event_id": "bad-4", "timestamp": "not-a-date", "source": "vision",
        "event_type": "x", "asset_id": "A", "severity": 10, "confidence": 0.5,
    })
    assert bad_timestamp.status_code == 422

    missing_asset = client.post("/api/events", json={
        "event_id": "bad-5", "timestamp": base, "source": "vision",
        "event_type": "x", "asset_id": "", "severity": 10, "confidence": 0.5,
    })
    assert missing_asset.status_code == 422

    for resp in (bad_source, bad_severity, bad_confidence, bad_timestamp, missing_asset):
        detail = resp.json()["detail"]
        assert detail["error"] == "invalid_event"
        assert len(detail["fields"]) >= 1

    assert client.get("/api/events").json()["count"] == 0


def test_stale_event_rejected(client):
    from datetime import timedelta
    old = datetime.now(timezone.utc) - timedelta(days=3)
    resp = client.post("/api/events", json=make_event("stale-1", "vision", "x", "A", base_time=old))
    assert resp.status_code == 422
