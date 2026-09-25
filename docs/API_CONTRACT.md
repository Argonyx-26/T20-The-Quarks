# SENTRIX Backend Contract

Owner: **Claude A** (backend/fusion). This is the canonical contract for
anything the frontend or sensor adapters need to integrate against. If you
change any of this, update this file in the same commit.

Base URL (local dev): `http://127.0.0.1:8000`

Run it:

```bash
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Run tests:

```bash
cd backend
./.venv/bin/python -m pytest -q
```

---

## Core principle

**LLMs explain incidents. They don't decide them.** Incident creation is
100% deterministic (`backend/app/fusion.py`) — time window, asset/zone
compatibility, source diversity. Nothing here calls an LLM. If/when an LLM
is added for SITREP text, it only summarizes incidents that already exist.

---

## Canonical schemas

### Event (what sensors POST)

```jsonc
{
  "event_id": "string, required, unique",
  "timestamp": "ISO-8601 datetime, required",
  "source": "vision | endpoint | network",
  "event_type": "string, required, free text (e.g. person_in_restricted_zone)",
  "asset_id": "string, required",
  "zone_id": "string or null — omit/null if the sensor doesn't know physical zone",
  "severity": "int 0-100",
  "confidence": "float 0.0-1.0",
  "attributes": { "...": "free-form, sensor-specific" },
  "evidence": { "...": "free-form, e.g. clip_url, flow_id, process name" }
}
```

Server adds on storage: `received_at`, `resolved_zone_id` (see zone
resolution below). These come back in every event object you read, but you
never send them.

### Incident (server-owned, read-only for clients)

```jsonc
{
  "incident_id": "INC-0001",
  "created_at": "...", "updated_at": "...",
  "status": "OPEN | ACKNOWLEDGED | RESOLVED",
  "severity": 0, "confidence": 0.0,
  "asset_id": "...", "zone_id": "... or null",
  "summary": "one-line human summary",
  "signals": ["event_id", "..."],
  "timeline": [{"timestamp": "...", "label": "source:event_type", "event_id": "..."}],
  "reasoning": ["deterministic fact strings, see fusion.py"],
  "recommended_action": "..."
}
```

Frontend must **not** synthesize or guess incident state. Treat the backend
as the single source of truth; render what it returns.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` | Ingest one event. Returns `{event, duplicate, incident, incident_created}`. 422 on malformed input. |
| GET | `/api/events?source=&asset_id=&limit=` | List stored events (filterable). |
| GET | `/api/events/{event_id}` | Fetch one event. 404 if unknown. |
| GET | `/api/incidents?status=` | List incidents, newest first. |
| GET | `/api/incidents/{incident_id}` | Fetch one incident. 404 if unknown. |
| POST | `/api/incidents/{incident_id}/status` | Body `{"status": "ACKNOWLEDGED"}`. Operator action. |
| GET | `/api/health` | System + per-source sensor health (`ok`/`stale`/`never_seen`). |
| GET | `/api/config` | Current fusion thresholds + asset→zone map (for display/debug). |
| POST | `/api/demo/reset` | Wipes all in-memory state. Broadcasts `system.reset`. |
| GET | `/api/demo/scenarios` | List available replay scenario names. |
| POST | `/api/demo/replay/{name}?live=true&speed=1.0` | Replays a scenario through the **exact same ingest path** as live events. `live=false` replays instantly (good for tests/CI); `live=true` paces events using their relative offsets (good for the actual demo). |
| WS | `/ws` | Realtime feed. See below. |

### Ingest error shape (422)

```json
{
  "detail": {
    "error": "invalid_event",
    "detail": "event failed schema validation",
    "fields": [{"field": "source", "message": "Input should be 'vision', 'endpoint' or 'network'"}]
  }
}
```

---

## WebSocket (`/ws`)

Connect, then just listen — you don't need to send anything (the server
reads-and-ignores to keep the socket open). Every message:

```json
{"type": "event.created | incident.created | incident.updated | sensor.health | system.reset", "data": {...}}
```

`data` is the full Event or Incident object (same shape as the REST
responses). On `system.reset`, `data` is just `{"reset_at": "..."}`.

Reconnect behavior: if the socket drops, just reconnect and re-fetch
`/api/events` + `/api/incidents` to resync — there is no message replay
buffer, the REST endpoints are the source of truth for "what did I miss".

---

## Correlation / fusion rules (`backend/app/fusion.py`, `backend/app/config.py`)

Configurable via env vars (defaults in parens):

- `SENTRIX_CORRELATION_WINDOW_SECONDS` (30) — max time gap considered.
- `SENTRIX_MIN_SOURCE_DIVERSITY` (3) — how many *distinct* sources
  (vision/endpoint/network) must agree on context before an incident is
  created. This is deliberately strict: two matching signals alone are not
  enough, by design (prevents coincidence-driven false positives).
- `SENTRIX_MIN_CONFIDENCE` (0.0), `SENTRIX_MIN_COMBINED_SEVERITY` (0) —
  secondary gates, permissive by default.
- `SENTRIX_ASSET_ZONE_MAP` — path to a JSON file mapping `asset_id -> zone_id`
  (defaults to `backend/asset_zone_map.json`). This is the **only** way an
  event without an explicit `zone_id` gets physical-zone context. Missing
  zone data is never treated as "same location" — see `resolve_zone()`.

**Compatibility rule** (`events_compatible`): two events may join the same
incident only if (a) they resolve to the same zone (direct report or via
the asset map), or (b) they share the exact same `asset_id`. Time proximity
alone never causes correlation.

**Confidence combination**: noisy-OR, `1 - Π(1 - c_i)` across all member
events — more corroborating signals monotonically raises confidence. This
is stated explicitly in `incident.reasoning`, not hidden.

If you need a lower bar for a specific demo moment (e.g. only 2 sensors
wired up), set `SENTRIX_MIN_SOURCE_DIVERSITY=2` when starting the server —
don't hardcode a special case in the frontend.

---

## Sensor → Asset → Zone

Sensor adapters (Claude C's subsystem) should send whatever `asset_id` they
know. If they also know the physical zone (e.g. a camera bound to a fixed
zone), set `zone_id` directly. If they don't (typical for endpoint/network
agents), leave `zone_id` null/omitted and make sure the asset is present in
`backend/asset_zone_map.json` — otherwise that event can only correlate via
exact `asset_id` match, not physical zone.

---

## Demo scenarios (`backend/scenarios/*.json`)

Each file is `{"description", "expected", "events": [...]}` where each event
has an `offset_seconds` (relative to replay start) instead of an absolute
timestamp — the replay endpoint computes real timestamps so replayed events
are never stale/future-rejected.

- `positive_correlation` — vision+endpoint+network agree on LAB-01 → incident.
- `asset_mismatch` — endpoint disagrees on asset → only 2 sources ever share
  context → below diversity threshold → no incident.
- `zone_mismatch` — vision in one zone, endpoint+network in another → no incident.
- `time_mismatch` — same asset/zone, but the third signal arrives long after
  the correlation window closed → no incident.

Add new scenarios by dropping another JSON file in `backend/scenarios/` —
no code change needed, `/api/demo/scenarios` picks it up automatically.
