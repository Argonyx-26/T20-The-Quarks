"""WebSocket broadcast hub. One /ws endpoint, JSON messages of shape
{"type": "<event.created|incident.created|incident.updated|sensor.health|system.reset>",
 "data": {...}}.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket

from .logging_conf import log_stage


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        log_stage("WS_CONNECTED", client_count=len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        log_stage("WS_DISCONNECTED", client_count=len(self.active))

    async def broadcast(self, msg_type: str, data: dict[str, Any]) -> None:
        if not self.active:
            return
        payload = json.dumps({"type": msg_type, "data": data}, default=str)
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
        log_stage("EVENT_BROADCAST", msg_type=msg_type, client_count=len(self.active))


manager = ConnectionManager()
