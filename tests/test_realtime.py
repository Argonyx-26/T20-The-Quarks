"""Realtime broadcast + reconnect resilience.

Required test cases covered here: WebSocket reconnect, dropped/late
subscriber not blocking ingestion.
"""
from __future__ import annotations

import asyncio
import json
import os

import httpx
import pytest
import websockets

from .conftest import make_event

BACKEND_URL = os.environ.get("SENTRIX_BACKEND_URL", "http://127.0.0.1:8000")
WS_URL = BACKEND_URL.replace("http://", "ws://").replace("https://", "wss://") + "/ws"


async def _collect_one(ws, expected_types, timeout=5.0):
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        remaining = max(0.1, deadline - loop.time())
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            break
        msg = json.loads(raw)
        if msg["type"] in expected_types:
            return msg
    return None


def test_websocket_receives_event_and_incident_broadcast(client: httpx.Client):
    async def _run():
        async with websockets.connect(WS_URL, open_timeout=5) as ws:
            base = {"asset_id": "LAB-01"}
            client.post("/api/events", json=make_event("vision", zone_id="RESTRICTED-LAB", **base))
            first = await _collect_one(ws, {"event.created"})
            assert first is not None, "no event.created broadcast received"

            client.post("/api/events", json=make_event("endpoint", **base))
            client.post("/api/events", json=make_event("network", **base))
            incident_msg = await _collect_one(ws, {"incident.created"})
            assert incident_msg is not None, "no incident.created broadcast received"
            assert incident_msg["data"]["asset_id"] == "LAB-01"

    asyncio.run(_run())


def test_websocket_reconnect_after_disconnect(client: httpx.Client):
    """Connect, disconnect, reconnect -- the second connection must work and
    the backend must still be serving ingestion/broadcast normally, proving
    a dropped client doesn't corrupt server state."""

    async def _run():
        async with websockets.connect(WS_URL, open_timeout=5) as ws1:
            pass  # immediately disconnect

        async with websockets.connect(WS_URL, open_timeout=5) as ws2:
            base = {"asset_id": "LAB-02"}
            client.post("/api/events", json=make_event("vision", zone_id="RESTRICTED-LAB", **base))
            msg = await _collect_one(ws2, {"event.created"})
            assert msg is not None, "reconnected client did not receive broadcast"

    asyncio.run(_run())


def test_system_reset_broadcasts_to_connected_clients(client: httpx.Client):
    async def _run():
        async with websockets.connect(WS_URL, open_timeout=5) as ws:
            client.post("/api/demo/reset")
            msg = await _collect_one(ws, {"system.reset"})
            assert msg is not None, "no system.reset broadcast received"

    asyncio.run(_run())
