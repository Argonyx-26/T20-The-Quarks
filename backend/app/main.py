"""
SENTRIX backend entrypoint.

    uvicorn app.main:app --reload --port 8000

See docs/API_CONTRACT.md (repo root) for the full endpoint/contract
reference consumed by the frontend and sensor adapters.
"""
from __future__ import annotations

import asyncio
import json
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
import os

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .fusion import FusionEngine, resolve_zone
from .logging_conf import log_stage
from .models import Device, Event, EventIn, Incident, IngestError, ValidationErrorDetail
from .security import BodySizeLimitMiddleware, SecurityHeadersMiddleware, rate_limit, websocket_origin_allowed
from .store import store
from .validation import EventRejected, parse_event
from .ws import manager

BASE_DIR = Path(__file__).resolve().parent.parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor_task = asyncio.create_task(_device_status_monitor())
    yield
    monitor_task.cancel()


app = FastAPI(
    title="SENTRIX Fusion Backend",
    version="1.0.0",
    docs_url="/docs" if config.ENABLE_DOCS else None,
    redoc_url="/redoc" if config.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if config.ENABLE_DOCS else None,
    lifespan=lifespan,
)

# Order matters: Starlette applies middleware in reverse of the order added,
# so CORS (added last) runs outermost and security headers land on every
# response including CORS preflights and error responses.
app.add_middleware(BodySizeLimitMiddleware, max_bytes=config.MAX_BODY_BYTES)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
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
        # Notification policy lives here, not in fusion.py: fusion decides
        # *whether signals relate*, this decides *who gets paged*. Only on
        # brand-new incidents (not every subsequent update to the same one,
        # which would re-siren paired phones for a single ongoing event).
        if created and incident.severity >= config.ALERT_SEVERITY_THRESHOLD:
            log_stage("ALERT_QUALIFIED", incident_id=incident.incident_id, severity=incident.severity, threshold=config.ALERT_SEVERITY_THRESHOLD)
            await manager.broadcast_alert(
                "incident.alert",
                {
                    "incidentId": incident.incident_id,
                    "severity": incident.severity,
                    "title": incident.summary,
                    "deviceName": incident.asset_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

    return event, incident, created, False


# ---------------------------------------------------------------------------
# Event endpoints
# ---------------------------------------------------------------------------

@app.post("/api/events", status_code=201, dependencies=[Depends(rate_limit)])
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


@app.post("/api/incidents/{incident_id}/status", dependencies=[Depends(rate_limit)])
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
# Device pairing + registry
#
# A device only exists here after a real pairing confirmation -- there is
# no synthesized/event-derived device list on this path. IP is observed,
# never trusted as identity; device_id (server-minted) is identity.
# ---------------------------------------------------------------------------

def _observed_ip(request: Request) -> Optional[str]:
    """The IP as seen by whatever connects directly to this process. Only
    reads X-Forwarded-For when SENTRIX_TRUST_PROXY_HEADERS is explicitly
    set (see config.py) -- otherwise a LAN client hitting this backend
    directly could spoof the header."""
    if config.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _device_token_from_request(request: Request) -> Optional[str]:
    header = request.headers.get("x-device-token")
    if header:
        return header
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


@app.post("/api/pairing")
async def create_pairing():
    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    async with store.lock:
        record = store.create_pairing_token(token, now, config.PAIRING_TTL_SECONDS)
    log_stage("PAIRING_CREATED", token_prefix=token[:8], expires_at=record.expires_at.isoformat())
    return {"token": token, "expires_at": record.expires_at.isoformat(), "ttl_seconds": config.PAIRING_TTL_SECONDS}


@app.get("/api/pairing/{token}")
async def get_pairing_status(token: str):
    record = store.get_pairing(token)
    if record is None:
        raise HTTPException(status_code=404, detail={"error": "not_found", "detail": "unknown pairing token"})
    now = datetime.now(timezone.utc)
    valid = (not record.used) and now < record.expires_at
    return {
        "valid": valid,
        "used": record.used,
        "expired": now >= record.expires_at,
        "expires_at": record.expires_at.isoformat(),
        "session_label": "SENTRIX Mission Control",
    }


@app.post("/api/pairing/{token}/confirm")
async def confirm_pairing(token: str, payload: dict[str, Any], request: Request):
    async with store.lock:
        record = store.get_pairing(token)
        if record is None:
            raise HTTPException(status_code=404, detail={"error": "not_found", "detail": "unknown pairing token"})
        now = datetime.now(timezone.utc)
        if record.used:
            raise HTTPException(status_code=409, detail={"error": "token_used", "detail": "pairing token already used"})
        if now >= record.expires_at:
            raise HTTPException(status_code=410, detail={"error": "token_expired", "detail": "pairing token expired"})

        store.consume_pairing(token)
        device_id = str(uuid.uuid4())
        device_token = secrets.token_urlsafe(32)
        display_name = str(payload.get("display_name") or "Paired Device").strip()[:60] or "Paired Device"
        device_type = str(payload.get("device_type") or "mobile").strip()[:30] or "mobile"
        ip_address = _observed_ip(request)

        device = store.register_device(device_id, device_token, display_name, device_type, ip_address, now)
        log_stage("DEVICE_PAIRED", device_id=device_id, display_name=display_name, ip_address=ip_address)

    await manager.broadcast("device.connected", device.model_dump())
    return {"device_id": device_id, "device_token": device_token, "status": device.status, "ip_address": device.ip_address}


@app.post("/api/devices/observe")
async def observe_device(payload: dict[str, Any], request: Request):
    """Trusted LOCAL sensor endpoint -- sensors/usb_sensor_daemon.py reports
    real macOS USB observations here. Deliberately restricted to localhost:
    this is not the QR-pairing path (no token, no credential), so it must
    never be reachable from an arbitrary LAN client claiming to be hardware.
    If the backend is ever deployed off the sensor's machine, this endpoint
    needs a real trust mechanism -- documented, not silently left open."""
    peer = request.client.host if request.client else None
    if peer not in ("127.0.0.1", "::1"):
        raise HTTPException(status_code=403, detail={"error": "forbidden", "detail": "device observation is local-sensor only"})

    hardware_id = str(payload.get("hardware_id") or "").strip()
    if not hardware_id:
        raise HTTPException(status_code=422, detail={"error": "invalid_observation", "detail": "hardware_id is required"})

    manufacturer = payload.get("manufacturer")
    product_name = payload.get("product_name")
    likely_phone = bool(payload.get("likely_phone"))
    device_type = "phone" if likely_phone else "usb_device"
    # Presentable but never invented: real manufacturer + a real MTP/PTP
    # signal is enough to say "phone" honestly, without guessing a model
    # macOS didn't actually tell us (no "Galaxy S24" out of a raw product
    # string like "KALAMA-MTP_CID:0437_SN:..."). Falls back to the raw
    # product string, then a fully generic label, only when there's
    # nothing better to show.
    if manufacturer and likely_phone:
        display_name = f"{manufacturer} device"
    elif manufacturer:
        display_name = f"{manufacturer} USB device"
    else:
        display_name = str(product_name or "USB device").strip()

    async with store.lock:
        now = datetime.now(timezone.utc)
        device, created = store.register_or_touch_observed_device(hardware_id, display_name, device_type, manufacturer, now)

    log_stage("USB_DEVICE_OBSERVED", device_id=device.device_id, created=created, manufacturer=manufacturer)
    await manager.broadcast("device.connected" if created else "device.updated", device.model_dump())
    return device.model_dump()


@app.get("/api/devices")
async def get_devices():
    devices = store.list_devices()
    return {"count": len(devices), "devices": [d.model_dump() for d in devices]}


@app.post("/api/devices/{device_id}/heartbeat")
async def device_heartbeat(device_id: str, request: Request):
    device_token = _device_token_from_request(request)
    async with store.lock:
        if not store.validate_device_credential(device_id, device_token):
            raise HTTPException(status_code=401, detail={"error": "unauthorized", "detail": "invalid device credential"})
        now = datetime.now(timezone.utc)
        device = store.touch_device_heartbeat(device_id, now)
        if device is None:
            raise HTTPException(status_code=404, detail={"error": "not_found", "detail": f"no device {device_id}"})

    await manager.broadcast("device.updated", device.model_dump())
    return device.model_dump()


# ---------------------------------------------------------------------------
# File upload + real SENTRIX event + Device 2 alert
# ---------------------------------------------------------------------------

UPLOAD_DIR = Path(os.environ.get("SENTRIX_UPLOAD_DIR", BASE_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = int(os.environ.get("SENTRIX_MAX_UPLOAD_BYTES", 50 * 1024 * 1024))  # 50 MB


def _safe_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    import re
    # Remove path components, keep only the filename
    filename = os.path.basename(filename)
    # Replace dangerous characters
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255 - len(ext)] + ext
    return filename or "upload"


async def _get_device2_if_online() -> Optional[Device]:
    """Find the most recently paired device that is ONLINE.
    This targets the second phone that was paired and is currently connected."""
    async with store.lock:
        devices = store.list_devices()
    # Filter paired_web devices, sort by paired_at (most recent first)
    paired_devices = [d for d in devices if d.transport == "paired_web" and d.paired_at]
    paired_devices.sort(key=lambda d: d.paired_at, reverse=True)
    # Return the most recently paired device that is ONLINE
    for device in paired_devices:
        if device.status == "ONLINE":
            return device
    return None


async def _send_file_alert_to_device(device_id: str, upload_data: dict) -> bool:
    """Send file.alert to a specific paired device via its WebSocket."""
    for ws, dev_id in list(manager.paired.items()):
        if dev_id == device_id:
            try:
                payload = json.dumps({"type": "file.alert", "data": upload_data}, default=str)
                await ws.send_text(payload)
                log_stage("FILE_ALERT_SENT", device_id=device_id, upload_id=upload_data.get("uploadId"))
                return True
            except Exception as e:
                log_stage("FILE_ALERT_FAILED", device_id=device_id, error=str(e))
                return False
    return False


@app.post("/api/files/upload", dependencies=[Depends(rate_limit)])
async def upload_file(file: UploadFile = File(...), request: Request = None):
    """Receive a real file, create a SENTRIX endpoint event, and alert Device 2 if online."""
    # Read and save file
    content = await file.read()
    file_bytes = len(content)
    
    if file_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail={"error": "file_too_large", "max_bytes": MAX_UPLOAD_BYTES})
    
    safe_name = _safe_filename(file.filename or "upload")
    upload_id = secrets.token_urlsafe(16)
    saved_name = f"{upload_id}_{safe_name}"
    saved_path = UPLOAD_DIR / saved_name
    
    # Save to disk
    with open(saved_path, "wb") as f:
        f.write(content)
    
    received_at = datetime.now(timezone.utc).isoformat()
    
    log_stage("UPLOAD_RECEIVED", upload_id=upload_id, filename=safe_name, bytes=file_bytes, mime_type=file.content_type)
    
    # Create SENTRIX event through normal ingestion pipeline
    event_payload = {
        "event_id": f"upload-{upload_id}",
        "timestamp": received_at,
        "source": "endpoint",
        "event_type": "file_upload_detected",
        "asset_id": "MISSION-CONTROL",
        "zone_id": None,
        "severity": 45,
        "confidence": 0.95,
        "attributes": {
            "filename": safe_name,
            "bytes": file_bytes,
            "mime_type": file.content_type or "application/octet-stream",
            "upload_id": upload_id,
        },
        "evidence": {
            "stored_path": str(saved_path),
        },
    }
    
    # Ingest through the real pipeline
    event, incident, created, duplicate = await ingest_event(event_payload)
    
    # Check for Device 2 and send alert
    device2 = await _get_device2_if_online()
    alert_delivered = False
    alert_failed_reason = None
    
    if device2:
        alert_data = {
            "uploadId": upload_id,
            "filename": safe_name,
            "bytes": file_bytes,
            "title": "New file activity detected",
        }
        alert_delivered = await _send_file_alert_to_device(device2.device_id, alert_data)
        if not alert_delivered:
            alert_failed_reason = "WebSocket send failed"
    else:
        alert_failed_reason = "Device 2 offline or not paired"
        log_stage("FILE_ALERT_SKIPPED", reason=alert_failed_reason, device_count=len(await _get_all_paired_devices()))
    
    return {
        "uploadId": upload_id,
        "filename": safe_name,
        "bytes": file_bytes,
        "receivedAt": received_at,
        "status": "received",
        "event": event.model_dump(),
        "device2Alert": {
            "delivered": alert_delivered,
            "deviceId": device2.device_id if device2 else None,
            "reason": alert_failed_reason,
        },
    }


async def _get_all_paired_devices():
    async with store.lock:
        return [d for d in store.list_devices() if d.transport == "paired_web"]


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
        "pairing_ttl_seconds": config.PAIRING_TTL_SECONDS,
        "alert_severity_threshold": config.ALERT_SEVERITY_THRESHOLD,
        "device_degraded_seconds": config.DEVICE_DEGRADED_SECONDS,
        "device_offline_seconds": config.DEVICE_OFFLINE_SECONDS,
    }


# ---------------------------------------------------------------------------
# Demo support -- reset / scenario list / replay. Replay calls ingest_event(),
# the exact same function live sensors use. No separate fake pathway.
# ---------------------------------------------------------------------------

@app.post("/api/demo/reset", dependencies=[Depends(rate_limit)])
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


@app.post("/api/demo/replay/{scenario_name}", dependencies=[Depends(rate_limit)])
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
async def websocket_endpoint(
    ws: WebSocket,
    role: str = "mission_control",
    device_id: Optional[str] = None,
    token: Optional[str] = None,
):
    if role == "paired_device":
        # A query string alone is never sufficient authorization -- the
        # credential (`token`, the device_token minted at pairing confirm)
        # must actually validate against the device_id it claims to be.
        if not device_id or not token or not store.validate_device_credential(device_id, token):
            log_stage("WS_REJECTED", role="paired_device", device_id=device_id)
            await ws.close(code=4401)
            return
        await manager.connect_paired(ws, device_id)
        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            manager.disconnect_paired(ws)
        return

    origin = ws.headers.get("origin")
    if not websocket_origin_allowed(origin):
        log_stage("WS_REJECTED", origin=origin)
        await ws.close(code=1008)
        return

    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # clients don't need to send anything; keeps connection open
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# Background device-status monitor -- the only proactive (non-request-driven)
# behavior in this backend. Without it, a device's status would only ever
# refresh when something happened to call GET /api/devices again; this keeps
# Mission Control's device list honest (ONLINE -> DEGRADED -> OFFLINE) via
# realtime pushes instead of the frontend polling.
# ---------------------------------------------------------------------------

async def _device_status_monitor() -> None:
    while True:
        await asyncio.sleep(config.DEVICE_MONITOR_INTERVAL_SECONDS)
        async with store.lock:
            changed = store.recompute_all_device_statuses(datetime.now(timezone.utc))
        for device, previous_status in changed:
            log_stage("DEVICE_STATUS_CHANGED", device_id=device.device_id, previous=previous_status, current=device.status)
            msg_type = "device.disconnected" if device.status == "OFFLINE" else "device.updated"
            await manager.broadcast(msg_type, device.model_dump())