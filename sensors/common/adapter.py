"""Shared sensor adapter interface.

The backend must not care whether an event came from a live camera, live
USB, synthetic network telemetry, or a replay file -- every source becomes
the same canonical Event via the same emit() -> BackendClient.post_event()
path. Concrete adapters (Vision/Endpoint/Network) implement only
start/stop/poll_once; this base class owns health bookkeeping, the
run loop, and event construction.
"""
from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

from .client import BackendClient, BackendUnreachable, EventRejected


class SensorAdapter(ABC):
    source: str = "unknown"

    def __init__(self, client: BackendClient, asset_id: str, zone_id: Optional[str] = None):
        self.client = client
        self.asset_id = asset_id
        self.zone_id = zone_id
        self._running = False
        self._last_error: Optional[str] = None
        self._last_emit_at: Optional[datetime] = None
        self._emit_count = 0
        self._degraded = False

    # -- lifecycle, implemented by concrete adapters ------------------------

    @abstractmethod
    def start(self) -> None:
        """Acquire whatever resource this adapter needs (camera, USB list,
        network baseline, ...). Must set self._running = True on success."""

    @abstractmethod
    def stop(self) -> None:
        """Release resources. Must set self._running = False."""

    @abstractmethod
    def poll_once(self) -> Optional[dict]:
        """Do one unit of sensing work. Returns the backend's response dict
        if an event was emitted this tick, else None. Never raises for
        expected "nothing happened" cases -- only for real failures."""

    # -- shared behavior ------------------------------------------------------

    def health(self) -> dict:
        return {
            "source": self.source,
            "running": self._running,
            "degraded": self._degraded,
            "emit_count": self._emit_count,
            "last_emit_at": self._last_emit_at.isoformat() if self._last_emit_at else None,
            "last_error": self._last_error,
        }

    def emit(
        self,
        event_type: str,
        severity: int,
        confidence: float,
        attributes: Optional[dict[str, Any]] = None,
        evidence: Optional[dict[str, Any]] = None,
        asset_id: Optional[str] = None,
        zone_id: Optional[str] = None,
        event_id: Optional[str] = None,
    ) -> dict:
        """Build the canonical Event payload and POST it. This is the ONLY
        way a concrete adapter should talk to the backend."""
        event = {
            "event_id": event_id or f"{self.source}-{uuid.uuid4().hex[:12]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": self.source,
            "event_type": event_type,
            "asset_id": asset_id or self.asset_id,
            "zone_id": zone_id if zone_id is not None else self.zone_id,
            "severity": severity,
            "confidence": confidence,
            "attributes": attributes or {},
            "evidence": evidence or {},
        }
        try:
            result = self.client.post_event(event)
            self._last_error = None
            self._degraded = False
            self._emit_count += 1
            self._last_emit_at = datetime.now(timezone.utc)
            return result
        except BackendUnreachable as exc:
            self._last_error = f"backend unreachable: {exc}"
            self._degraded = True
            raise
        except EventRejected as exc:
            self._last_error = f"event rejected: {exc}"
            raise

    def run_loop(self, interval: float = 1.0, max_iterations: Optional[int] = None, on_event=None) -> None:
        self.start()
        try:
            i = 0
            while self._running and (max_iterations is None or i < max_iterations):
                try:
                    result = self.poll_once()
                    if result is not None and on_event is not None:
                        on_event(result)
                except BackendUnreachable as exc:
                    self._last_error = str(exc)
                    self._degraded = True
                except Exception as exc:  # keep the loop alive; log and continue
                    self._last_error = str(exc)
                time.sleep(interval)
                i += 1
        finally:
            self.stop()
