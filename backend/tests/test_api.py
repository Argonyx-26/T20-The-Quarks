from datetime import datetime, timezone

from .helpers import make_event


def test_health_reports_never_seen_then_ok(client):
    health = client.get("/api/health").json()
    assert health["status"] == "ok"
    assert health["sensors"]["vision"]["status"] == "never_seen"

    client.post("/api/events", json=make_event("h1", "vision", "x", "A"))
    health2 = client.get("/api/health").json()
    assert health2["sensors"]["vision"]["status"] == "ok"
    assert health2["event_count"] == 1


def test_config_exposes_thresholds(client):
    cfg = client.get("/api/config").json()
    assert "correlation_window_seconds" in cfg
    assert "minimum_source_diversity" in cfg
    assert "asset_zone_map" in cfg
    assert cfg["asset_zone_map"]["LAB-01"] == "RESTRICTED-LAB"


def test_reset_clears_state(client):
    client.post("/api/events", json=make_event("r1", "vision", "x", "A"))
    assert client.get("/api/events").json()["count"] == 1

    resp = client.post("/api/demo/reset")
    assert resp.status_code == 200
    assert client.get("/api/events").json()["count"] == 0
    assert client.get("/api/incidents").json()["count"] == 0


def test_replay_scenarios_match_expected_outcomes(client):
    scenarios = client.get("/api/demo/scenarios").json()["scenarios"]
    assert "positive_correlation" in scenarios
    assert "asset_mismatch" in scenarios
    assert "zone_mismatch" in scenarios
    assert "time_mismatch" in scenarios

    r = client.post("/api/demo/replay/positive_correlation?live=false")
    assert r.status_code == 200
    results = r.json()["results"]
    assert any(item.get("incident_created") for item in results)

    client.post("/api/demo/reset")
    r2 = client.post("/api/demo/replay/asset_mismatch?live=false")
    results2 = r2.json()["results"]
    assert all(not item.get("incident_created") for item in results2)
    assert client.get("/api/incidents").json()["count"] == 0


def test_incident_status_update(client):
    from .helpers import make_event
    base = datetime.now(timezone.utc)
    client.post("/api/events", json=make_event("s1", "vision", "x", "LAB-01", zone_id="RESTRICTED-LAB", offset=0, base_time=base))
    client.post("/api/events", json=make_event("s2", "endpoint", "x", "LAB-01", offset=3, base_time=base))
    r3 = client.post("/api/events", json=make_event("s3", "network", "x", "LAB-01", offset=6, base_time=base))
    incident_id = r3.json()["incident"]["incident_id"]

    r = client.post(f"/api/incidents/{incident_id}/status", json={"status": "acknowledged"})
    assert r.status_code == 200
    assert r.json()["status"] == "ACKNOWLEDGED"

    bad = client.post(f"/api/incidents/{incident_id}/status", json={"status": "nonsense"})
    assert bad.status_code == 422
