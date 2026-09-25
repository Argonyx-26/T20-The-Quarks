"""Shared fixtures for SENTRIX integration/E2E tests.

These tests hit a REAL running backend over HTTP (not an in-process test
client) -- the point of this suite is integration confidence: does the
process that a judge would actually run behave correctly end to end,
including the WebSocket broadcast path and the demo replay pipeline.

Start the backend first:
    backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

Then run:
    backend/.venv/bin/pytest tests/ -v
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest

BACKEND_URL = os.environ.get("SENTRIX_BACKEND_URL", "http://127.0.0.1:8000")


@pytest.fixture(scope="session")
def base_url() -> str:
    try:
        httpx.get(f"{BACKEND_URL}/api/health", timeout=3).raise_for_status()
    except Exception as exc:
        pytest.skip(f"backend not reachable at {BACKEND_URL} ({exc}) -- start it first")
    return BACKEND_URL


@pytest.fixture()
def client(base_url: str) -> httpx.Client:
    with httpx.Client(base_url=base_url, timeout=10) as c:
        yield c


@pytest.fixture(autouse=True)
def reset_state(client: httpx.Client):
    """Every test starts from a clean backend so tests don't interfere."""
    client.post("/api/demo/reset")
    yield


def make_event(
    source: str,
    asset_id: str,
    event_type: str = "test_event",
    zone_id: str | None = None,
    severity: int = 50,
    confidence: float = 0.7,
    timestamp: datetime | None = None,
    event_id: str | None = None,
    **extra,
) -> dict:
    payload = {
        "event_id": event_id or f"test-{uuid.uuid4().hex[:10]}",
        "timestamp": (timestamp or datetime.now(timezone.utc)).isoformat(),
        "source": source,
        "event_type": event_type,
        "asset_id": asset_id,
        "zone_id": zone_id,
        "severity": severity,
        "confidence": confidence,
        "attributes": {},
        "evidence": {},
    }
    payload.update(extra)
    return payload
