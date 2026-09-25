"""Integration Gates 1-3 from the SENTRIX command brief:

Gate 1 (event path): event -> backend ingests -> stores -> retrievable.
Gate 2 (fusion): 3 matching-context events -> incident; mismatched context
                 -> no incident.
Gate 3 (replay): replay uses the exact same backend + fusion pipeline as
                 live events, and produces the same outcome each run.
"""
from __future__ import annotations

import httpx

from .conftest import make_event


def test_gate1_event_path_end_to_end(client: httpx.Client):
    event = make_event("network", "GATE1-ASSET", event_type="probe")
    resp = client.post("/api/events", json=event)
    assert resp.status_code == 201
    body = resp.json()
    assert body["event"]["event_id"] == event["event_id"]

    fetched = client.get(f"/api/events/{event['event_id']}")
    assert fetched.status_code == 200
    assert fetched.json()["asset_id"] == "GATE1-ASSET"

    listing = client.get("/api/events", params={"asset_id": "GATE1-ASSET"})
    assert listing.status_code == 200
    assert listing.json()["count"] == 1


def test_gate2_positive_correlation_creates_incident(client: httpx.Client):
    base = {"asset_id": "LAB-01"}
    client.post("/api/events", json=make_event("vision", zone_id="RESTRICTED-LAB", **base))
    client.post("/api/events", json=make_event("endpoint", **base))
    resp = client.post("/api/events", json=make_event("network", **base))

    body = resp.json()
    assert body["incident_created"] is True
    assert body["incident"]["asset_id"] == "LAB-01"
    assert body["incident"]["zone_id"] == "RESTRICTED-LAB"
    assert len(body["incident"]["signals"]) == 3
    assert set(s.split(":")[0] for s in [t["label"] for t in body["incident"]["timeline"]]) == {
        "vision",
        "endpoint",
        "network",
    }


def test_gate2_asset_mismatch_no_incident(client: httpx.Client):
    client.post("/api/events", json=make_event("vision", "LAB-A"))
    client.post("/api/events", json=make_event("endpoint", "LAB-B"))
    resp = client.post("/api/events", json=make_event("network", "LAB-A"))

    assert resp.json()["incident_created"] is False
    assert client.get("/api/incidents").json()["count"] == 0


def test_gate2_zone_mismatch_no_incident(client: httpx.Client):
    client.post("/api/events", json=make_event("vision", "GATE-CTRL-01", zone_id="PERIMETER"))
    client.post("/api/events", json=make_event("endpoint", "SRV-RACK-01"))
    resp = client.post("/api/events", json=make_event("network", "SRV-RACK-01"))

    assert resp.json()["incident_created"] is False


def test_gate2_two_sources_insufficient(client: httpx.Client):
    """Explicit required case from the brief: two sources instead of three
    must not create an incident, even with perfect asset/zone/time match."""
    client.post("/api/events", json=make_event("vision", "LAB-01", zone_id="RESTRICTED-LAB"))
    resp = client.post("/api/events", json=make_event("endpoint", "LAB-01"))

    assert resp.json()["incident_created"] is False
    assert client.get("/api/incidents").json()["count"] == 0


def test_gate3_replay_uses_same_pipeline_as_live(client: httpx.Client):
    live_events = [
        make_event("vision", "LAB-02", zone_id="RESTRICTED-LAB", event_id="replaycmp-v"),
        make_event("endpoint", "LAB-02", event_id="replaycmp-e"),
        make_event("network", "LAB-02", event_id="replaycmp-n"),
    ]
    for e in live_events:
        client.post("/api/events", json=e)
    live_incidents = client.get("/api/incidents").json()["incidents"]
    assert len(live_incidents) == 1
    assert live_incidents[0]["asset_id"] == "LAB-02"

    client.post("/api/demo/reset")

    replay_resp = client.post("/api/demo/replay/positive_correlation", params={"live": "false"})
    assert replay_resp.status_code == 200
    results = replay_resp.json()["results"]
    assert any(r.get("incident_created") for r in results)

    replayed_incidents = client.get("/api/incidents").json()["incidents"]
    assert len(replayed_incidents) == 1
    assert replayed_incidents[0]["asset_id"] == "LAB-01"  # scenario's own asset


def test_gate3_negative_scenarios_produce_no_incident(client: httpx.Client):
    for scenario in ["asset_mismatch", "zone_mismatch", "time_mismatch"]:
        client.post("/api/demo/reset")
        resp = client.post(f"/api/demo/replay/{scenario}", params={"live": "false"})
        assert resp.status_code == 200, scenario
        assert client.get("/api/incidents").json()["count"] == 0, f"{scenario} unexpectedly created an incident"


def test_gate3_repeated_replay_is_deterministic(client: httpx.Client):
    """Required test case: repeated demo. Run the positive scenario 5 times
    from a clean reset and confirm identical outcome every time."""
    for _ in range(5):
        client.post("/api/demo/reset")
        resp = client.post("/api/demo/replay/positive_correlation", params={"live": "false"})
        results = resp.json()["results"]
        created_flags = [r.get("incident_created") for r in results]
        assert created_flags == [False, False, True], created_flags
        incidents = client.get("/api/incidents").json()["incidents"]
        assert len(incidents) == 1
        assert incidents[0]["severity"] == 70
        assert round(incidents[0]["confidence"], 4) == 0.9856
