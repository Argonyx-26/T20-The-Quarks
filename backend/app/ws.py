"""WebSocket broadcast hub.

Two logical client roles share the same /ws endpoint:

- Mission Control (`self.active`): unchanged since day one -- gets every
  full envelope (event.created, incident.created/updated, sensor.health,
  system.reset, device.connected/updated/disconnected).
- Paired phones (`self.paired`): only ever receive a minimal
  `incident.alert` envelope via `broadcast_alert`. They never touch
  `self.active` or the full-payload `broadcast` path -- the privacy split
  is enforced here, server-side, not by the client choosing to ignore
  fields.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket

from .logging_conf import log_stage


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []
        self.paired: dict[WebSocket, str] = {}  # ws -> device_id

    # -- mission control (full payload) -------------------------------------

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        log_stage("WS_CONNECTED", role="mission_control", client_count=len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        log_stage("WS_DISCONNECTED", role="mission_control", client_count=len(self.active))

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
        log_stage("EVENT_BROADCAST", msg_type=msg_type, role="mission_control", client_count=len(self.active))

    # -- paired phones (minimal payload only) -------------------------------

    async def connect_paired(self, ws: WebSocket, device_id: str) -> None:
        await ws.accept()
        self.paired[ws] = device_id
        log_stage("WS_CONNECTED", role="paired_device", device_id=device_id, client_count=len(self.paired))

    def disconnect_paired(self, ws: WebSocket) -> None:
        device_id = self.paired.pop(ws, None)
        log_stage("WS_DISCONNECTED", role="paired_device", device_id=device_id, client_count=len(self.paired))

    async def broadcast_alert(self, msg_type: str, data: dict[str, Any]) -> None:
        """Sends to every currently-paired device. No targeting logic today
        -- every paired phone is an "authorized alert recipient" (documented
        policy, not an accident)."""
        if not self.paired:
            return
        payload = json.dumps({"type": msg_type, "data": data}, default=str)
        dead: list[WebSocket] = []
        for ws in list(self.paired.keys()):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_paired(ws)
        log_stage("ALERT_BROADCAST", msg_type=msg_type, recipient_count=len(self.paired))


manager = ConnectionManager()
