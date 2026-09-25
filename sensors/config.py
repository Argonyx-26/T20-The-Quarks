"""Runtime configuration for sensor adapters.

Plain env-var overrides, matching backend/app/config.py's philosophy: a
24-hour hackathon integration layer needs obvious, demo-adjustable
constants, not a settings framework.
"""
from __future__ import annotations

import os

BACKEND_URL = os.environ.get("SENTRIX_BACKEND_URL", "http://127.0.0.1:8000")

DEFAULT_ASSET_ID = os.environ.get("SENTRIX_DEFAULT_ASSET", "LAB-01")
DEFAULT_ZONE_ID = os.environ.get("SENTRIX_DEFAULT_ZONE", "RESTRICTED-LAB")

HTTP_TIMEOUT_SECONDS = float(os.environ.get("SENTRIX_HTTP_TIMEOUT_SECONDS", 5))

VISION_CAMERA_INDEX = int(os.environ.get("SENTRIX_CAMERA_INDEX", 0))
VISION_POLL_INTERVAL_SECONDS = float(os.environ.get("SENTRIX_VISION_POLL_INTERVAL", 0.5))

ENDPOINT_POLL_INTERVAL_SECONDS = float(os.environ.get("SENTRIX_ENDPOINT_POLL_INTERVAL", 3.0))
ENDPOINT_WATCH_DIR = os.environ.get(
    "SENTRIX_ENDPOINT_WATCH_DIR", os.path.expanduser("~/.sentrix_endpoint_watch")
)

NETWORK_POLL_INTERVAL_SECONDS = float(os.environ.get("SENTRIX_NETWORK_POLL_INTERVAL", 1.0))
NETWORK_BASELINE_WINDOW = int(os.environ.get("SENTRIX_NETWORK_BASELINE_WINDOW", 10))
NETWORK_DEVIATION_THRESHOLD_SIGMA = float(os.environ.get("SENTRIX_NETWORK_DEVIATION_SIGMA", 3.0))
