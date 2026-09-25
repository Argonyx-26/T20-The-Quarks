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
from datetime import datetime, timezone
from typing import Optional

from .models import Event, Incident


class Store:
    def __init__(self) -> None:
        self.lock = asyncio.Lock()
        self._events: dict[str, Event] = {}
        self._incidents: dict[str, Incident] = {}
        self._sensor_last_seen: dict[str, datetime] = {}
        self._incident_seq = itertools.count(1)
        self.started_at = datetime.now(timezone.utc)

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

    # -- lifecycle -------------------------------------------------------

    def reset(self) -> None:
        self._events.clear()
        self._incidents.clear()
        self._sensor_last_seen.clear()
        self._incident_seq = itertools.count(1)
        self.started_at = datetime.now(timezone.utc)

    def stats(self) -> dict:
        return {
            "event_count": len(self._events),
            "incident_count": len(self._incidents),
            "open_incident_count": len(self.open_incidents()),
        }


store = Store()
