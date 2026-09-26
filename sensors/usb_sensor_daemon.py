"""
Polls real macOS USB state (sensors/usb_device_detector.py) and reports
observations to the SENTRIX backend's local-sensor endpoint.

Deliberately a small poller, not IOKit run-loop callbacks -- this is a
24-hour hackathon backend and a 3s poll is more than fast enough for a
demo, per the project's own "don't overengineer" convention. Never marks
a device offline itself: reporting simply stops when a device disappears
from a scan, and the backend's own device_status_monitor (already built
for QR-paired phones, reused here unchanged) transitions it through
DEGRADED -> OFFLINE on missed refreshes. There is exactly one source of
truth for device status, and it isn't this script.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sensors import config
from sensors.common.client import BackendClient, BackendUnreachable
from sensors.usb_device_detector import scan_usb_devices

POLL_INTERVAL_SECONDS = float(os.environ.get("SENTRIX_USB_SCAN_INTERVAL", 3.0))


def main() -> None:
    client = BackendClient(base_url=config.BACKEND_URL)
    print(f"[USB] SENTRIX USB sensor online -- polling every {POLL_INTERVAL_SECONDS:.0f}s against {config.BACKEND_URL}")

    known_hardware_ids: set[str] = set()

    while True:
        devices = scan_usb_devices()
        current_ids = {d.hardware_id for d in devices}

        for device in devices:
            label = device.product_name or device.manufacturer or "unknown USB device"
            try:
                result = client.observe_device(device.to_backend_payload())
                if device.hardware_id not in known_hardware_ids:
                    print(f"[USB] connected hardware_id={device.hardware_id[:12]}... ({label}) -> device_id={result.get('device_id')}")
                else:
                    print(f"[USB] still present: {label}")
            except BackendUnreachable as exc:
                print(f"[USB] backend unreachable, will retry: {exc}")

        disappeared = known_hardware_ids - current_ids
        for hw_id in disappeared:
            print(f"[USB] no longer visible to macOS: {hw_id[:12]}... (backend will age it out via missed refresh)")

        known_hardware_ids = current_ids
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
