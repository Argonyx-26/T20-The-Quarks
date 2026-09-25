"""Event payload validation -> clean, structured rejection on failure."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from . import config
from .models import EventIn, ValidationErrorDetail


class EventRejected(Exception):
    """Raised for any malformed or out-of-policy event payload."""

    def __init__(self, detail: str, fields: list[ValidationErrorDetail] | None = None):
        self.detail = detail
        self.fields = fields or []
        super().__init__(detail)


def parse_event(payload: Any) -> EventIn:
    if not isinstance(payload, dict):
        raise EventRejected("request body must be a JSON object")

    try:
        event = EventIn.model_validate(payload)
    except ValidationError as exc:
        fields = [
            ValidationErrorDetail(
                field=".".join(str(p) for p in err["loc"]) or "<root>",
                message=err["msg"],
            )
            for err in exc.errors()
        ]
        raise EventRejected("event failed schema validation", fields) from exc

    _check_policy(event)
    return event


def _check_policy(event: EventIn) -> None:
    now = datetime.now(timezone.utc)
    age_seconds = (now - event.timestamp).total_seconds()

    if age_seconds > config.MAX_EVENT_AGE_SECONDS:
        raise EventRejected(
            f"event timestamp is stale ({age_seconds:.0f}s old, "
            f"max allowed {config.MAX_EVENT_AGE_SECONDS:.0f}s)"
        )

    if age_seconds < -60:
        raise EventRejected(
            f"event timestamp is {abs(age_seconds):.0f}s in the future"
        )
