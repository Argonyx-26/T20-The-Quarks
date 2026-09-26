"""
Real macOS USB device detection.

WHY ioreg AND NOT system_profiler: during development, `system_profiler
SPUSBDataType` (both plain and `-json`) reliably returned a clean, empty
result in the shell environment this was built in -- exit code 0, no
stdout, no stderr. `ioreg -p IOUSB -l -w 0 -a`, which talks to IOKit's
device tree more directly, reliably returned the real connected-device
data instead. This module was verified against an actually-connected
phone before being written: `ioreg` surfaced

    USB Vendor Name  = "OnePlus"
    USB Product Name = "KALAMA-MTP_CID:0437_SN:42FB0050"
    idVendor = 8921, idProduct = 10084
    USB Serial Number = "42fb0050"

for a real phone plugged in over USB, in MTP mode. If `system_profiler`
DOES work in your environment, ioreg's output is a strict subset of the
same real IOKit data, so there is no reason to run both -- ioreg alone is
the primary and only detector here (see docs: "prefer built-in sources,
don't run three competing identity systems").

Never fabricates a name: a field macOS doesn't expose comes back `None`.
A device is only flagged `likely_phone` on positive evidence (an MTP/PTP
descriptor in its product name) -- otherwise it's reported as a generic,
correctly-unidentified USB device rather than guessed at.
"""
from __future__ import annotations

import hashlib
import plistlib
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass
class UsbDeviceObservation:
    hardware_id: str
    manufacturer: Optional[str]
    product_name: Optional[str]
    serial_number: Optional[str]
    vendor_id: Optional[int]
    product_id: Optional[int]
    location_id: Optional[int]
    likely_phone: bool
    observed_at: str

    def to_backend_payload(self) -> dict:
        """What actually gets POSTed to /api/devices/observe. The raw
        serial number is deliberately NOT included -- hardware_id (a
        one-way hash of it) is the stable identity; the serial itself
        never needs to leave this process."""
        return {
            "hardware_id": self.hardware_id,
            "manufacturer": self.manufacturer,
            "product_name": self.product_name,
            "likely_phone": self.likely_phone,
            "vendor_id": self.vendor_id,
            "product_id": self.product_id,
        }


def _stable_hardware_id(vendor_id, product_id, serial: Optional[str], location_id) -> str:
    """SHA-256, not Python's hash() (randomized per-process, would mint a
    new "device" every backend restart). A real serial survives a port
    change; falling back to vendor+product+location is still stable
    across polls of the SAME connection, just not across a different USB
    port if the device has no serial at all."""
    basis = serial if serial else f"{vendor_id}:{product_id}:{location_id}"
    return hashlib.sha256(f"usb:{basis}".encode("utf-8")).hexdigest()[:24]


def _looks_like_phone(product_name: Optional[str]) -> bool:
    if not product_name:
        return False
    lowered = product_name.lower()
    return "mtp" in lowered or "ptp" in lowered


def _walk(node: dict, out: list) -> None:
    if "idVendor" in node or "USB Vendor Name" in node:
        out.append(node)
    for child in node.get("IORegistryEntryChildren", []) or []:
        _walk(child, out)


def scan_usb_devices() -> list[UsbDeviceObservation]:
    """Runs ioreg for real, parses the real plist tree macOS returns.
    Returns an empty list -- never a fabricated device -- if ioreg fails,
    times out, or its output doesn't parse."""
    try:
        proc = subprocess.run(
            ["ioreg", "-p", "IOUSB", "-l", "-w", "0", "-a"],
            capture_output=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return []
    except (subprocess.SubprocessError, OSError):
        return []

    try:
        root = plistlib.loads(proc.stdout)
    except Exception:
        return []

    candidates: list[dict] = []
    _walk(root, candidates)

    now = datetime.now(timezone.utc).isoformat()
    observations = []
    for node in candidates:
        vendor = node.get("USB Vendor Name")
        product = node.get("USB Product Name") or node.get("IORegistryEntryName")
        serial = node.get("USB Serial Number") or node.get("kUSBSerialNumberString")
        vendor_id = node.get("idVendor")
        product_id = node.get("idProduct")
        location_id = node.get("locationID")

        observations.append(
            UsbDeviceObservation(
                hardware_id=_stable_hardware_id(vendor_id, product_id, serial, location_id),
                manufacturer=vendor,
                product_name=product,
                serial_number=serial,
                vendor_id=vendor_id,
                product_id=product_id,
                location_id=location_id,
                likely_phone=_looks_like_phone(product),
                observed_at=now,
            )
        )
    return observations


if __name__ == "__main__":
    devices = scan_usb_devices()
    print(f"Detected USB candidates: {len(devices)}")
    for i, d in enumerate(devices, 1):
        print(f"{i}.")
        print(f"   manufacturer: {d.manufacturer}")
        print(f"   product: {d.product_name}")
        print(f"   likely_phone: {d.likely_phone}")
        print(f"   serial available: {'yes' if d.serial_number else 'no'}")
        print(f"   hardware_id: {d.hardware_id}")
