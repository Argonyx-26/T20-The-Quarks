"""ReplayAdapter -- deterministic scenario playback.

Deliberately thin: the backend's own POST /api/demo/replay/{scenario}
already loads the scenario JSON and pushes every event through the exact
same ingest_event() function live sensors use (see backend/app/main.py).
This adapter does not reimplement that pipeline or add a second, frontend
-visible fake playback path -- it just gives the integration/QA layer a
uniform, scriptable entry point with the same start/stop/health/emit shape
as the live adapters, for use from health checks, demo scripts, and tests.
"""
from __future__ import annotations

from typing import Optional

from .common.adapter import SensorAdapter
from .common.client import BackendClient


class ReplayAdapter(SensorAdapter):
    source = "replay"

    def __init__(self, client: BackendClient):
        super().__init__(client, asset_id="*", zone_id=None)

    def start(self) -> None:
        self._running = True

    def stop(self) -> None:
        self._running = False

    def poll_once(self) -> Optional[dict]:
        return None  # replay is invoked explicitly via run_scenario(), not polled

    def list_scenarios(self) -> list[str]:
        return self.client.list_scenarios()

    def run_scenario(self, name: str, live: bool = False, speed: float = 1.0) -> dict:
        result = self.client.replay(name, live=live, speed=speed)
        self._emit_count += len(result.get("results", []))
        return result
