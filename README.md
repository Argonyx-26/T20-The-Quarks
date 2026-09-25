# SENTRIX

Intelligent Threat Detection & Situational Awareness System — built for
Argonyx '26 by Team The Quarks.

**Security systems see events. SENTRIX sees relationships.**

```
VISION + ENDPOINT + NETWORK
        |
STANDARDIZED EVENTS
        |
   EVENT STREAM
        |
CONTEXTUAL FUSION  (deterministic — time + asset + zone + confidence + source diversity)
        |
  INCIDENT OBJECT
        |
REAL-TIME MISSION CONTROL
```

LLMs, if used anywhere in this project, only **explain** already-created
incidents (SITREP text, summaries). They never decide whether an incident
exists — that's deterministic fusion logic. See
`docs/API_CONTRACT.md`.

## Subsystem ownership

| Directory | Owner | Status |
|---|---|---|
| `backend/` | Backend/fusion architect | Implemented — see `docs/API_CONTRACT.md` |
| `frontend/` | Mission Control UI | Not started |
| `sensors/` | Vision/endpoint/network adapters | Implemented — see `sensors/README.md` |

## Quickstart (backend)

```bash
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

Health check: `curl localhost:8000/api/health`

Run the demo pipeline without any real sensors:

```bash
curl -X POST localhost:8000/api/demo/reset
curl -X POST "localhost:8000/api/demo/replay/positive_correlation?live=true"
curl localhost:8000/api/incidents
```

Tests: `cd backend && ./.venv/bin/python -m pytest -q`

Full API/WebSocket contract, fusion rules, and event schema:
**[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)**.

## Quickstart (sensors + integration)

```bash
cd sensors
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
```

```bash
# one-off checks against a running backend
./.venv/bin/python -m sensors.run network --once
./.venv/bin/python -m sensors.run endpoint --once
./.venv/bin/python -m sensors.run vision --once   # needs camera permission; --manual works without one
./.venv/bin/python -m sensors.run replay --list
```

Operator scripts (from repo root):

```bash
./scripts/start.sh    # start backend (+ frontend if present)
./scripts/health.sh   # [OK]/[DEGRADED] status for backend, ws, fusion, each sensor, frontend
./scripts/demo.sh     # reset -> positive scenario (incident) -> negative scenario (no incident)
./scripts/reset.sh    # clear all in-memory state
./scripts/stop.sh     # stop what start.sh started
```

Integration/E2E/chaos test suite (hits a real running backend, not mocks):

```bash
cd backend && ./.venv/bin/pytest ../tests/ -v
```

See `sensors/README.md` for adapter details (what's live vs. fallback).
