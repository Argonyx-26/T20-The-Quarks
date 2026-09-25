"""
Structured, judge-readable logging.

Every pipeline stage emits one line with a fixed set of fields so the
terminal is legible during a live demo:

  EVENT_RECEIVED  EVENT_VALIDATED  EVENT_STORED  EVENT_REJECTED
  FUSION_EVALUATED  INCIDENT_CREATED  INCIDENT_UPDATED  EVENT_BROADCAST
"""
from __future__ import annotations

import json
import logging
import sys
import time
from typing import Any

logger = logging.getLogger("sentrix")
logger.setLevel(logging.INFO)

if not logger.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)
    logger.propagate = False


def log_stage(action: str, **fields: Any) -> None:
    """Emit one structured log line for a pipeline stage.

    Format is `ACTION key=value key=value ...` -- readable directly in a
    terminal during a demo, but still trivially greppable/parseable.
    """
    fields.setdefault("ts", round(time.time(), 3))
    parts = [f"[{action}]"]
    for k, v in fields.items():
        if isinstance(v, float):
            v = round(v, 4)
        parts.append(f"{k}={v}")
    logger.info(" ".join(parts))


def log_json(action: str, **fields: Any) -> None:
    """Emit one JSON log line, for when a consumer wants to parse logs."""
    payload = {"action": action, "ts": time.time(), **fields}
    logger.info(json.dumps(payload, default=str))
