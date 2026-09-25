from datetime import datetime, timedelta, timezone


def make_event(
    event_id: str,
    source: str,
    event_type: str,
    asset_id: str,
    zone_id: str | None = None,
    severity: int = 50,
    confidence: float = 0.7,
    offset: float = 0,
    attributes: dict | None = None,
    evidence: dict | None = None,
    base_time: datetime | None = None,
) -> dict:
    base_time = base_time or datetime.now(timezone.utc)
    return {
        "event_id": event_id,
        "timestamp": (base_time + timedelta(seconds=offset)).isoformat(),
        "source": source,
        "event_type": event_type,
        "asset_id": asset_id,
        "zone_id": zone_id,
        "severity": severity,
        "confidence": confidence,
        "attributes": attributes or {},
        "evidence": evidence or {},
    }
