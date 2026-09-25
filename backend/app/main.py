"""
SENTRIX backend entrypoint.

    uvicorn app.main:app --reload --port 8000

See docs/API_CONTRACT.md (repo root) for the full endpoint/contract
reference consumed by the frontend and sensor adapters.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .fusion import FusionEngine, resolve_zone
from .logging_conf import log_stage
from .models import Event, EventIn, Incident, IngestError, ValidationErrorDetail
from .store import store
from .validation import EventRejected, parse_event
from .ws import manager

app = FastAPI(title="SENTRIX Fusion Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

fusion = FusionEngine(store)

SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "scenarios"


# ---------------------------------------------------------------------------
# Shared ingestion pipeline -- used by BOTH the live POST /api/events route
# and the demo replay route. There is no second/fake ingestion path.
# ---------------------------------------------------------------------------

async def ingest_event(payload: dict[str, Any]) -> tuple[Event, Optional[Incident], bool, bool]:
    """validate -> normalize -> store -> log -> fusion -> broadcast.

    Returns (event, incident_or_none, incident_created, was_duplicate).
    Raises EventRejected on malformed input.
    """
    event_in: EventIn = parse_event(payload)

    async with store.lock:
        log_stage(
            "EVENT_RECEIVED", event_id=event_in.event_id, source=event_in.source,
            event_type=event_in.event_type, asset_id=event_in.asset_id,
        )

        if store.has_event(event_in.event_id):
            log_stage("EVENT_DUPLICATE", event_id=event_in.event_id)
            existing = store.get_event(event_in.event_id)
            assert existing is not None
            return existing, None, False, True

        log_stage("EVENT_VALIDATED", event_id=event_in.event_id)

        event = Event(**event_in.model_dump())
        event.resolved_zone_id = resolve_zone(event)
        store.add_event(event)
        log_stage(
            "EVENT_STORED", event_id=event.event_id, resolved_zone_id=event.resolved_zone_id,
            total_events=len(store.all_events()),
        )

        incident, created = fusion.evaluate(event)
        log_stage(
            "FUSION_EVALUATED", event_id=event.event_id,
            result=("incident_created" if created else "incident_updated" if incident else "no_incident"),
            incident_id=(incident.incident_id if incident else None),
        )

    await manager.broadcast("event.created", event.model_dump())
    if incident is not None:
        await manager.broadcast("incident.created" if created else "incident.updated", incident.model_dump())

    return event, incident, created, False


# ---------------------------------------------------------------------------
# Event endpoints
# ---------------------------------------------------------------------------

@app.post("/api/events", status_code=201)
async def post_event(payload: dict[str, Any]):
    try:
        event, incident, created, duplicate = await ingest_event(payload)
    except EventRejected as exc:
        err = IngestError(error="invalid_event", detail=exc.detail, fields=exc.fields)
        raise HTTPException(status_code=422, detail=err.model_dump())

    return {
        "event": event.model_dump(),
        "duplicate": duplicate,
        "incident": incident.model_dump() if incident else None,
        "incident_created": created,
    }


@app.get("/api/events")
async def get_events(
    source: Optional[str] = None,
    asset_id: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=10000),
):
    events = store.list_events(source=source, asset_id=asset_id, limit=limit)
    return {"count": len(events), "events": [e.model_dump() for e in events]}


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    event = store.get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail={"error": "not_found", "detail": f"no event {event_id}"})
    return event.model_dump()


# ---------------------------------------------------------------------------
# Incident endpoints
# ---------------------------------------------------------------------------

@app.get("/api/incidents")
async def get_incidents(status: Optional[str] = None):
    incidents = store.list_incidents()
    if status:
        incidents = [i for i in incidents if i.status == status.upper()]
    return {"count": len(incidents), "incidents": [i.model_dump() for i in incidents]}


@app.get("/api/incidents/{incident_id}")
async def get_incident(incident_id: str):
    incident = store.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail={"error": "not_found", "detail": f"no incident {incident_id}"})
    return incident.model_dump()


@app.post("/api/incidents/{incident_id}/status")
async def set_incident_status(incident_id: str, payload: dict[str, Any]):
    incident = store.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail={"error": "not_found", "detail": f"no incident {incident_id}"})
    new_status = str(payload.get("status", "")).upper()
    if new_status not in config.ALLOWED_STATUSES:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_status", "detail": f"status must be one of {sorted(config.ALLOWED_STATUSES)}"},
        )
    incident.status = new_status  # type: ignore[assignment]
    incident.updated_at = datetime.now(timezone.utc)
    store.upsert_incident(incident)
    log_stage("INCIDENT_UPDATED", incident_id=incident_id, status=new_status, reason="operator_action")
    await manager.broadcast("incident.updated", incident.model_dump())
    return incident.model_dump()


# ---------------------------------------------------------------------------
# Health / config
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    now = datetime.now(timezone.utc)
    last_seen = store.sensor_last_seen()
    sensors = {}
    for source in sorted(config.ALLOWED_SOURCES):
        ts = last_seen.get(source)
        if ts is None:
            sensors[source] = {"status": "never_seen", "last_seen": None}
        else:
            age = (now - ts).total_seconds()
            sensors[source] = {
                "status": "ok" if age <= config.SENSOR_STALE_SECONDS else "stale",
                "last_seen": ts.isoformat(),
                "age_seconds": round(age, 1),
            }
    return {
        "status": "ok",
        "started_at": store.started_at.isoformat(),
        "server_time": now.isoformat(),
        "sensors": sensors,
        **store.stats(),
    }


@app.get("/api/config")
async def get_config():
    return {
        "correlation_window_seconds": config.CORRELATION_WINDOW_SECONDS,
        "minimum_source_diversity": config.MINIMUM_SOURCE_DIVERSITY,
        "minimum_confidence": config.MINIMUM_CONFIDENCE,
        "minimum_combined_severity": config.MINIMUM_COMBINED_SEVERITY,
        "asset_zone_map": config.ASSET_ZONE_MAP,
        "allowed_sources": sorted(config.ALLOWED_SOURCES),
    }


# ---------------------------------------------------------------------------
# Demo support -- reset / scenario list / replay. Replay calls ingest_event(),
# the exact same function live sensors use. No separate fake pathway.
# ---------------------------------------------------------------------------

@app.post("/api/demo/reset")
async def demo_reset():
    async with store.lock:
        store.reset()
    log_stage("SYSTEM_RESET")
    await manager.broadcast("system.reset", {"reset_at": datetime.now(timezone.utc).isoformat()})
    return {"status": "reset"}


@app.get("/api/demo/scenarios")
async def demo_scenarios():
    if not SCENARIOS_DIR.exists():
        return {"scenarios": []}
    names = sorted(p.stem for p in SCENARIOS_DIR.glob("*.json"))
    return {"scenarios": names}


@app.post("/api/demo/replay/{scenario_name}")
async def demo_replay(scenario_name: str, live: bool = True, speed: float = 1.0):
    path = SCENARIOS_DIR / f"{scenario_name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail={"error": "not_found", "detail": f"no scenario {scenario_name}"})

    with open(path, "r", encoding="utf-8") as fh:
        scenario = json.load(fh)

    items = scenario["events"] if isinstance(scenario, dict) else scenario
    max_offset = max((float(item.get("offset_seconds", 0)) for item in items), default=0.0)
    # Anchor so the LAST event lands at "now" -- keeps every replayed
    # timestamp in the past regardless of scenario duration.
    base_time = datetime.now(timezone.utc) - timedelta(seconds=max_offset)
    results = []
    prev_offset = 0.0

    for item in items:
        offset = float(item.get("offset_seconds", 0))
        if live:
            wait = max(0.0, (offset - prev_offset) / max(speed, 0.01))
            if wait > 0:
                await asyncio.sleep(min(wait, 10.0))
        prev_offset = offset

        payload = {k: v for k, v in item.items() if k != "offset_seconds"}
        payload["timestamp"] = (base_time + timedelta(seconds=offset)).isoformat()

        try:
            event, incident, created, duplicate = await ingest_event(payload)
            results.append({
                "event_id": event.event_id,
                "duplicate": duplicate,
                "incident_id": incident.incident_id if incident else None,
                "incident_created": created,
            })
        except EventRejected as exc:
            results.append({"error": exc.detail, "payload": payload})

    return {"scenario": scenario_name, "results": results}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # clients don't need to send anything; keeps connection open
    except WebSocketDisconnect:
        manager.disconnect(ws)
