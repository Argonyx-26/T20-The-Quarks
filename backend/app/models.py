"""
Canonical Event and Incident schemas for SENTRIX.

These are the shared contract between vision/endpoint/network sensor
adapters (producers) and the frontend Mission Control UI (consumer). Do not
rename fields without updating docs/API_CONTRACT.md and every consumer.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from . import config

Source = Literal["vision", "endpoint", "network"]
IncidentStatus = Literal["OPEN", "ACKNOWLEDGED", "RESOLVED"]


class EventIn(BaseModel):
    """Payload accepted by POST /api/events. Validation happens here."""

    event_id: str = Field(..., min_length=1)
    timestamp: datetime
    source: Source
    event_type: str = Field(..., min_length=1)
    asset_id: str = Field(..., min_length=1)
    zone_id: Optional[str] = None
    severity: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0.0, le=1.0)
    attributes: dict[str, Any] = Field(default_factory=dict)
    evidence: dict[str, Any] = Field(default_factory=dict)

    @field_validator("timestamp")
    @classmethod
    def _timestamp_must_be_timezone_sane(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v

    @field_validator("event_id", "event_type", "asset_id")
    @classmethod
    def _no_blank_strings(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("zone_id")
    @classmethod
    def _blank_zone_is_none(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            return None
        return v


class Event(EventIn):
    """Stored event -- identical to EventIn plus server-assigned bookkeeping."""

    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_zone_id: Optional[str] = None

    def compatibility_key(self) -> tuple[str, str]:
        """('zone', <zone>) if a zone could be resolved, else ('asset', <asset_id>)."""
        if self.resolved_zone_id:
            return ("zone", self.resolved_zone_id)
        return ("asset", self.asset_id)


class TimelineEntry(BaseModel):
    timestamp: datetime
    label: str
    event_id: Optional[str] = None


class Incident(BaseModel):
    incident_id: str
    created_at: datetime
    updated_at: datetime
    status: IncidentStatus = "OPEN"
    severity: int
    confidence: float
    asset_id: str
    zone_id: Optional[str] = None
    summary: str
    signals: list[str] = Field(default_factory=list)  # event_ids
    timeline: list[TimelineEntry] = Field(default_factory=list)
    reasoning: list[str] = Field(default_factory=list)
    recommended_action: str = ""


class ValidationErrorDetail(BaseModel):
    field: str
    message: str


class IngestError(BaseModel):
    error: str
    detail: str
    fields: list[ValidationErrorDetail] = Field(default_factory=list)
