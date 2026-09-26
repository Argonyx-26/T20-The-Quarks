"""
Runtime configuration for the SENTRIX fusion engine.

Everything here is intentionally a plain, editable constant (or env-var
override) rather than a database-backed settings system -- this is a
24-hour hackathon backend and the tunables need to be obvious and
demo-adjustable, not "enterprise configurable".
"""
from __future__ import annotations

import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Fusion thresholds
# ---------------------------------------------------------------------------

# How close in time two events must be to even be considered for the same
# incident. Widened for a live demo where a human is triggering signals by
# hand; tighten for automated replay if needed.
CORRELATION_WINDOW_SECONDS = float(os.environ.get("SENTRIX_CORRELATION_WINDOW_SECONDS", 30))

# Number of *distinct* sources (vision / endpoint / network) that must agree
# on the same asset/zone context within the window before we promote a group
# of events into an Incident. This is the single most important knob: it is
# what stops two coincidentally-matching signals from becoming a false
# incident (see docs/API_CONTRACT.md "Correlation principle").
MINIMUM_SOURCE_DIVERSITY = int(os.environ.get("SENTRIX_MIN_SOURCE_DIVERSITY", 3))

# Floor thresholds. Deliberately permissive by default -- the source
# diversity + context match requirement above is doing the real work of
# preventing false positives. These exist as a second, explicit gate rather
# than being folded into a single opaque "risk score".
MINIMUM_CONFIDENCE = float(os.environ.get("SENTRIX_MIN_CONFIDENCE", 0.0))
MINIMUM_COMBINED_SEVERITY = float(os.environ.get("SENTRIX_MIN_COMBINED_SEVERITY", 0))

# An event older than this relative to "now" is considered stale and will be
# rejected at ingestion (protects fusion from being seeded with ancient
# replay artifacts after a long-idle demo box).
MAX_EVENT_AGE_SECONDS = float(os.environ.get("SENTRIX_MAX_EVENT_AGE_SECONDS", 24 * 3600))

# How long without any event from a given source before /api/health reports
# that sensor as "disconnected" rather than "ok".
SENSOR_STALE_SECONDS = float(os.environ.get("SENTRIX_SENSOR_STALE_SECONDS", 60))

# ---------------------------------------------------------------------------
# Asset -> Zone mapping
# ---------------------------------------------------------------------------
# This is the ONLY mechanism by which an event lacking an explicit zone_id
# (typically endpoint/network events, which usually know an asset but not a
# physical zone) can be attributed to a physical zone. We never infer zone
# equality just because two events are missing zone_id -- see
# fusion.py:resolve_zone.

_DEFAULT_ASSET_ZONE_MAP = {
    "LAB-01": "RESTRICTED-LAB",
    "LAB-02": "RESTRICTED-LAB",
    "SRV-RACK-01": "SERVER-ROOM",
    "SRV-RACK-02": "SERVER-ROOM",
    "GATE-CTRL-01": "PERIMETER",
    "WKSTN-17": "OFFICE-FLOOR-2",
}

_ASSET_ZONE_MAP_PATH = Path(os.environ.get("SENTRIX_ASSET_ZONE_MAP", BASE_DIR / "asset_zone_map.json"))


def _load_asset_zone_map() -> dict[str, str]:
    if _ASSET_ZONE_MAP_PATH.exists():
        try:
            with open(_ASSET_ZONE_MAP_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items()}
        except (json.JSONDecodeError, OSError):
            pass
    return dict(_DEFAULT_ASSET_ZONE_MAP)


ASSET_ZONE_MAP: dict[str, str] = _load_asset_zone_map()

# ---------------------------------------------------------------------------
# Validation enums
# ---------------------------------------------------------------------------

ALLOWED_SOURCES = {"vision", "endpoint", "network"}
ALLOWED_STATUSES = {"OPEN", "ACKNOWLEDGED", "RESOLVED"}

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------

# Deployment mode. "production" tightens a couple of defaults below
# (disables interactive API docs, which is the only HTML this JSON backend
# ever serves). Everything else about error handling is unaffected -- the
# app never runs with FastAPI's `debug=True`, so unhandled exceptions
# already return a generic 500 with no stack trace regardless of this flag.
ENV = os.environ.get("SENTRIX_ENV", "development")
ENABLE_DOCS = ENV != "production"

# CORS: only these origins may call the API from a browser. Never "*" --
# the frontend dev server's own ports, explicitly, plus anything an
# operator adds for a deployed demo box.
_DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.environ.get("SENTRIX_ALLOWED_ORIGINS", ",".join(_DEFAULT_ALLOWED_ORIGINS)).split(",")
    if o.strip()
]

# Hard cap on request body size. Event payloads (including free-form
# `attributes`/`evidence`) are small JSON documents; this just stops a
# client from sending an arbitrarily large body to exhaust memory.
MAX_BODY_BYTES = int(os.environ.get("SENTRIX_MAX_BODY_BYTES", 64 * 1024))

# Per-client-IP rate limits for mutation routes (event ingestion + demo
# control + incident status). Generous by design -- this exists to blunt
# accidental request storms (a buggy sensor loop, a double-clicked demo
# button), not to police a controlled hackathon demo. `request.client.host`
# is trusted directly; there is no reverse proxy in front of this backend,
# so `X-Forwarded-For` is deliberately never trusted as the client identity.
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("SENTRIX_RATE_LIMIT_REQUESTS", 120))
RATE_LIMIT_WINDOW_SECONDS = float(os.environ.get("SENTRIX_RATE_LIMIT_WINDOW_SECONDS", 10))

# ---------------------------------------------------------------------------
# Device pairing / realtime notification
# ---------------------------------------------------------------------------

# How long a QR/pairing token stays valid before it must be re-issued.
PAIRING_TTL_SECONDS = float(os.environ.get("SENTRIX_PAIRING_TTL_SECONDS", 300))

# A created/updated incident broadcasts a minimal alert to paired phones only
# when its severity meets this bar. Backend-owned -- a phone client never
# decides this itself.
ALERT_SEVERITY_THRESHOLD = int(os.environ.get("SENTRIX_ALERT_SEVERITY_THRESHOLD", 70))

# Device heartbeat freshness -> status. Mirrors SENSOR_STALE_SECONDS above:
# a device is ONLINE while recently heard from, DEGRADED once a heartbeat is
# overdue, OFFLINE once several are missed. A device that has never sent a
# heartbeat is UNKNOWN, never coerced to ONLINE.
DEVICE_DEGRADED_SECONDS = float(os.environ.get("SENTRIX_DEVICE_DEGRADED_SECONDS", 20))
DEVICE_OFFLINE_SECONDS = float(os.environ.get("SENTRIX_DEVICE_OFFLINE_SECONDS", 45))

# How often the background monitor re-checks device freshness and broadcasts
# device.updated/device.disconnected for status transitions nobody's
# heartbeat happened to trigger (see main.py:device_status_monitor). Keeps
# Mission Control's device list honest without the frontend polling.
DEVICE_MONITOR_INTERVAL_SECONDS = float(os.environ.get("SENTRIX_DEVICE_MONITOR_INTERVAL_SECONDS", 5))

# Only trust X-Forwarded-For for the observed device IP when explicitly told
# to -- this backend has no reverse proxy in front of it by default, and a
# LAN client hitting it directly could otherwise spoof the header. The
# Vite dev proxy (frontend/vite.config.ts) sets this header automatically,
# so a same-laptop LAN demo can opt in.
TRUST_PROXY_HEADERS = os.environ.get("SENTRIX_TRUST_PROXY_HEADERS", "false").lower() == "true"

ALLOWED_DEVICE_STATUSES = {"ONLINE", "DEGRADED", "OFFLINE", "UNKNOWN"}