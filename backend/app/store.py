"""
In-memory state for SENTRIX.

A hackathon demo does not need a database: it needs state that is fast,
transparent, and trivially resettable between runs. Everything lives in
process memory and is guarded by a single asyncio.Lock so that concurrent
ingest requests can't race the fusion engine.
"""
from __future__ import annotations

import asyncio
import itertools
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from . import config
from .models import Device, DeviceStatus, Event, Incident


@dataclass
class PairingRecord:
    token: str
    created_at: datetime
    expires_at: datetime
    used: bool = False


class Store:
    def __init__(self) -> None:
        self.lock = asyncio.Lock()
        self._events: dict[str, Event] = {}
        self._incidents: dict[str, Incident] = {}
        self._sensor_last_seen: dict[str, datetime] = {}
        self._incident_seq = itertools.count(1)
        self.started_at = datetime.now(timezone.utc)
        self._pairing_tokens: dict[str, PairingRecord] = {}
        self._devices: dict[str, Device] = {}
        self._device_credentials: dict[str, str] = {}  # device_token -> device_id
        self._devices_by_hardware_id: dict[str, str] = {}  # usb hardware_id -> device_id

    # -- events ------------------------------------------------------------

    def has_event(self, event_id: str) -> bool:
        return event_id in self._events

    def add_event(self, event: Event) -> None:
        self._events[event.event_id] = event
        self._sensor_last_seen[event.source] = event.received_at

    def get_event(self, event_id: str) -> Optional[Event]:
        return self._events.get(event_id)

    def all_events(self) -> list[Event]:
        return sorted(self._events.values(), key=lambda e: e.timestamp)

    def list_events(
        self,
        source: Optional[str] = None,
        asset_id: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> list[Event]:
        events = self.all_events()
        if source:
            events = [e for e in events if e.source == source]
        if asset_id:
            events = [e for e in events if e.asset_id == asset_id]
        if limit:
            events = events[-limit:]
        return events

    def events_within(self, start: datetime, end: datetime) -> list[Event]:
        return [e for e in self.all_events() if start <= e.timestamp <= end]

    # -- incidents -----------------------------------------------------------

    def next_incident_id(self) -> str:
        return f"INC-{next(self._incident_seq):04d}"

    def upsert_incident(self, incident: Incident) -> None:
        self._incidents[incident.incident_id] = incident

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.get(incident_id)

    def list_incidents(self) -> list[Incident]:
        return sorted(self._incidents.values(), key=lambda i: i.created_at, reverse=True)

    def open_incidents(self) -> list[Incident]:
        return [i for i in self._incidents.values() if i.status == "OPEN"]

    # -- sensor health -------------------------------------------------------

    def sensor_last_seen(self) -> dict[str, datetime]:
        return dict(self._sensor_last_seen)

    # -- pairing ---------------------------------------------------------

    def create_pairing_token(self, token: str, now: datetime, ttl_seconds: float) -> PairingRecord:
        record = PairingRecord(token=token, created_at=now, expires_at=now + timedelta(seconds=ttl_seconds))
        self._pairing_tokens[token] = record
        return record

    def get_pairing(self, token: str) -> Optional[PairingRecord]:
        return self._pairing_tokens.get(token)

    def consume_pairing(self, token: str) -> None:
        record = self._pairing_tokens.get(token)
        if record is not None:
            record.used = True

    # -- devices -----------------------------------------------------------

    def compute_device_status(self, device: Device, now: datetime) -> DeviceStatus:
        age = (now - device.last_seen).total_seconds()
        if age <= config.DEVICE_DEGRADED_SECONDS:
            return "ONLINE"
        if age <= config.DEVICE_OFFLINE_SECONDS:
            return "DEGRADED"
        return "OFFLINE"

    def register_device(
        self,
        device_id: str,
        device_token: str,
        display_name: str,
        device_type: str,
        ip_address: Optional[str],
        now: datetime,
    ) -> Device:
        device = Device(
            device_id=device_id,
            display_name=display_name,
            device_type=device_type,
            ip_address=ip_address,
            status="ONLINE",
            first_seen=now,
            last_seen=now,
            paired_at=now,
            transport="paired_web",
        )
        self._devices[device_id] = device
        self._device_credentials[device_token] = device_id
        return device

    # -- USB-observed devices (sensors/usb_device_detector.py) ----------------
    # A distinct registration path from QR pairing: no token, no credential,
    # trusted only because /api/devices/observe is restricted to localhost
    # (see main.py) -- the sensor runs on the same machine as the backend.

    def get_device_by_hardware_id(self, hardware_id: str) -> Optional[Device]:
        device_id = self._devices_by_hardware_id.get(hardware_id)
        return self.get_device(device_id) if device_id else None

    def register_or_touch_observed_device(
        self,
        hardware_id: str,
        display_name: str,
        device_type: str,
        manufacturer: Optional[str],
        now: datetime,
    ) -> tuple[Device, bool]:
        """Returns (device, created). Same hardware_id always maps to the
        same device_id -- a replug never creates a duplicate."""
        existing_id = self._devices_by_hardware_id.get(hardware_id)
        if existing_id and existing_id in self._devices:
            device = self._devices[existing_id]
            device.last_seen = now
            device.status = self.compute_device_status(device, now)
            return device, False

        device_id = existing_id or f"usb-{hardware_id[:16]}"
        device = Device(
            device_id=device_id,
            display_name=display_name,
            device_type=device_type,
            status="ONLINE",
            first_seen=now,
            last_seen=now,
            transport="usb",
            manufacturer=manufacturer,
        )
        self._devices[device_id] = device
        self._devices_by_hardware_id[hardware_id] = device_id
        return device, True

    def get_device(self, device_id: str) -> Optional[Device]:
        device = self._devices.get(device_id)
        if device is None:
            return None
        device.status = self.compute_device_status(device, datetime.now(timezone.utc))
        return device

    def list_devices(self) -> list[Device]:
        now = datetime.now(timezone.utc)
        devices = []
        for device in self._devices.values():
            device.status = self.compute_device_status(device, now)
            devices.append(device)
        return sorted(devices, key=lambda d: d.paired_at or d.first_seen)

    def validate_device_credential(self, device_id: str, device_token: Optional[str]) -> bool:
        if not device_token:
            return False
        return self._device_credentials.get(device_token) == device_id

    def touch_device_heartbeat(self, device_id: str, now: datetime) -> Optional[Device]:
        device = self._devices.get(device_id)
        if device is None:
            return None
        device.last_seen = now
        device.status = self.compute_device_status(device, now)
        return device

    def recompute_all_device_statuses(self, now: datetime) -> list[tuple[Device, DeviceStatus]]:
        """Returns (device, previous_status) for every device whose status
        just changed, so the caller can decide what to broadcast."""
        changed: list[tuple[Device, DeviceStatus]] = []
        for device in self._devices.values():
            new_status = self.compute_device_status(device, now)
            if new_status != device.status:
                previous = device.status
                device.status = new_status
                changed.append((device, previous))
        return changed

    # -- lifecycle -------------------------------------------------------

    def reset(self) -> None:
        self._events.clear()
        self._incidents.clear()
        self._sensor_last_seen.clear()
        self._incident_seq = itertools.count(1)
        self.started_at = datetime.now(timezone.utc)
        self._pairing_tokens.clear()
        self._devices.clear()
        self._device_credentials.clear()
        self._devices_by_hardware_id.clear()

    def stats(self) -> dict:
        return {
            "event_count": len(self._events),
            "incident_count": len(self._incidents),
            "open_incident_count": len(self.open_incidents()),
        }


store = Store()
