"""EndpointAdapter -- USB attach detection with a platform-safe fallback.

Primary: poll `system_profiler SPUSBDataType -json` (built into macOS, no
extra dependency) and diff the set of attached device identifiers between
polls. This is real OS-level USB enumeration, not a simulation.

Fallback: if system_profiler is unavailable/unsupported (non-macOS) or
fails repeatedly, degrade to watching a local folder for new files. Both
paths still flow through the same EndpointAdapter.emit() -> canonical Event.
"""
from __future__ import annotations

import json
import platform
import subprocess
from pathlib import Path
from typing import Optional

from .common.adapter import SensorAdapter
from .common.client import BackendClient
from . import config


def _flatten_usb_items(items: list[dict]) -> set[str]:
    """Recursively collect a stable identifier per USB device node."""
    found: set[str] = set()
    for item in items:
        name = item.get("_name", "unknown")
        serial = item.get("serial_num", "")
        vendor = item.get("vendor_id", "")
        product = item.get("product_id", "")
        found.add(f"{name}|{vendor}|{product}|{serial}")
        children = item.get("_items")
        if isinstance(children, list):
            found |= _flatten_usb_items(children)
    return found


class EndpointAdapter(SensorAdapter):
    source = "endpoint"

    def __init__(
        self,
        client: BackendClient,
        asset_id: str,
        zone_id: Optional[str] = None,
        watch_dir: Optional[str] = None,
    ):
        super().__init__(client, asset_id, zone_id)
        self.watch_dir = Path(watch_dir or config.ENDPOINT_WATCH_DIR)
        self._use_native_usb = platform.system() == "Darwin"
        self._known_usb: set[str] = set()
        self._known_files: set[Path] = set()
        self._consecutive_native_failures = 0

    def start(self) -> None:
        if self._use_native_usb:
            try:
                self._known_usb = self._list_usb_devices()
            except Exception:
                self._use_native_usb = False  # fall back for the whole session
        if not self._use_native_usb:
            self.watch_dir.mkdir(parents=True, exist_ok=True)
            self._known_files = set(self.watch_dir.iterdir())
            self._degraded = True  # running in fallback mode, but functional
        self._running = True

    def stop(self) -> None:
        self._running = False

    def _list_usb_devices(self) -> set[str]:
        proc = subprocess.run(
            ["system_profiler", "SPUSBDataType", "-json"],
            capture_output=True,
            text=True,
            timeout=8,
        )
        proc.check_returncode()
        data = json.loads(proc.stdout)
        items = data.get("SPUSBDataType", [])
        return _flatten_usb_items(items)

    def poll_once(self) -> Optional[dict]:
        if self._use_native_usb:
            try:
                current = self._list_usb_devices()
                self._consecutive_native_failures = 0
            except Exception as exc:
                self._consecutive_native_failures += 1
                if self._consecutive_native_failures >= 2:
                    # Native USB polling is unreliable on this machine right
                    # now -- degrade to the folder fallback rather than
                    # blocking the whole adapter.
                    self._use_native_usb = False
                    self.watch_dir.mkdir(parents=True, exist_ok=True)
                    self._known_files = set(self.watch_dir.iterdir())
                    self._degraded = True
                    return None
                raise RuntimeError(f"system_profiler failed: {exc}") from exc

            added = current - self._known_usb
            self._known_usb = current
            if not added:
                return None
            return self.emit(
                event_type="usb_device_attached",
                severity=60,
                confidence=0.75,
                attributes={"devices": sorted(added)[:5], "device_count": len(added)},
                evidence={"detector": "system_profiler_spusbdatatype"},
            )

        current_files = set(self.watch_dir.iterdir())
        added_files = current_files - self._known_files
        self._known_files = current_files
        if not added_files:
            return None
        return self.emit(
            event_type="usb_device_attached",
            severity=60,
            confidence=0.6,
            attributes={"files": [p.name for p in added_files]},
            evidence={"detector": "watched_folder_fallback", "watch_dir": str(self.watch_dir)},
        )
