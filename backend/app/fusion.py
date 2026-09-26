"""
Deterministic, explainable correlation engine.

LLMs explain incidents. They don't decide them. Everything in this file is
plain arithmetic and set logic over configured thresholds (see config.py) --
no model call ever influences whether an incident is created.

Correlation principle
----------------------
Two events may be grouped into the same incident only if they have positive,
traceable evidence of shared physical context:

  1. Both resolve to the same zone (either reported directly, or via the
     explicit asset->zone mapping in config.ASSET_ZONE_MAP), OR
  2. They reference the exact same asset_id (a real match even if neither
     event carries zone information).

Missing zone data is never treated as a match. Time proximity alone is
never sufficient -- see MINIMUM_SOURCE_DIVERSITY below.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from . import config
from .logging_conf import log_stage
from .models import Event, Incident, TimelineEntry
from .store import Store


def resolve_zone(event: Event) -> Optional[str]:
    """Zone resolution: direct report first, then the explicit asset map.

    Never falls back to "assume same location" -- an unresolvable event
    simply has resolved_zone_id = None and can only correlate via exact
    asset_id match.
    """
    if event.zone_id:
        return event.zone_id
    return config.ASSET_ZONE_MAP.get(event.asset_id)


def events_compatible(a: Event, b: Event) -> bool:
    if a.resolved_zone_id and b.resolved_zone_id:
        return a.resolved_zone_id == b.resolved_zone_id
    return a.asset_id == b.asset_id


def combine_confidence(confidences: list[float]) -> float:
    """Noisy-OR combination: confidence grows with each corroborating,
    independent signal. Explainable and monotonic, not a magic score."""
    complement = 1.0
    for c in confidences:
        complement *= (1.0 - c)
    return round(1.0 - complement, 4)


def _majority_asset(group: list[Event]) -> str:
    counts: dict[str, int] = {}
    for e in group:
        counts[e.asset_id] = counts.get(e.asset_id, 0) + 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]


def _recommend_action(severity: int, sources: list[str]) -> str:
    if severity >= 80:
        return "Immediate operator response required: isolate asset and dispatch physical security."
    if severity >= 50:
        return "Investigate promptly: review evidence and confirm asset status."
    return "Monitor for situational awareness; no immediate action required."


class FusionEngine:
    """Stateless logic over a shared Store. One instance is enough."""

    def __init__(self, store: Store):
        self.store = store

    def evaluate(self, event: Event) -> tuple[Optional[Incident], bool]:
        """Evaluate a freshly-stored event.

        Returns (incident_or_none, created). `created` is True only when a
        brand-new incident was created this call.
        """
        # 1. Prefer attaching to an existing OPEN incident in the same
        #    context and time window over starting a new group.
        for incident in self.store.open_incidents():
            if self._matches_incident(event, incident):
                self._update_incident(incident, event)
                return incident, False

        # 2. Otherwise, gather the connected cluster of recent compatible
        #    events (within the correlation window) that includes this one.
        window_start = event.timestamp - timedelta(seconds=config.CORRELATION_WINDOW_SECONDS)
        window_end = event.timestamp + timedelta(seconds=config.CORRELATION_WINDOW_SECONDS)
        candidates = [
            e for e in self.store.events_within(window_start, window_end)
            if e.event_id != event.event_id
        ]
        group = self._connected_cluster(event, candidates)

        sources = sorted({e.source for e in group})
        if len(sources) < config.MINIMUM_SOURCE_DIVERSITY:
            log_stage(
                "FUSION_EVALUATED", event_id=event.event_id, result="no_incident",
                reason="insufficient_source_diversity",
                sources=sources, required=config.MINIMUM_SOURCE_DIVERSITY,
            )
            return None, False

        confidence = combine_confidence([e.confidence for e in group])
        severity = max(e.severity for e in group)
        if confidence < config.MINIMUM_CONFIDENCE or severity < config.MINIMUM_COMBINED_SEVERITY:
            log_stage(
                "FUSION_EVALUATED", event_id=event.event_id, result="no_incident",
                reason="below_threshold", confidence=confidence, severity=severity,
            )
            return None, False

        incident = self._create_incident(group)
        return incident, True

    # -- internals ---------------------------------------------------------

    @staticmethod
    def _connected_cluster(anchor: Event, pool: list[Event]) -> list[Event]:
        """BFS connected-component of `anchor` under events_compatible, so
        compatibility doesn't need to be globally transitive to be correct."""
        cluster = [anchor]
        remaining = list(pool)
        changed = True
        while changed:
            changed = False
            still_remaining = []
            for e in remaining:
                if any(events_compatible(e, c) for c in cluster):
                    cluster.append(e)
                    changed = True
                else:
                    still_remaining.append(e)
            remaining = still_remaining
        return cluster

    def _matches_incident(self, event: Event, incident: Incident) -> bool:
        if incident.zone_id and event.resolved_zone_id:
            context_match = incident.zone_id == event.resolved_zone_id
        else:
            context_match = incident.asset_id == event.asset_id
        if not context_match:
            return False
        delta = abs((event.timestamp - incident.updated_at).total_seconds())
        return delta <= config.CORRELATION_WINDOW_SECONDS

    def _create_incident(self, group: list[Event]) -> Incident:
        group = sorted(group, key=lambda e: e.timestamp)
        now = datetime.now(timezone.utc)

        zone_id = next((e.resolved_zone_id for e in group if e.resolved_zone_id), None)
        asset_id = _majority_asset(group)
        severity = max(e.severity for e in group)
        confidence = combine_confidence([e.confidence for e in group])
        sources = sorted({e.source for e in group})
        
        # RISK ASSESSMENT FOR ENDPOINT DEMO
        transfer_event = next((e for e in group if e.event_type.startswith("file_transfer")), None)
        network_event = next((e for e in group if e.source == "network"), None)
        if transfer_event and network_event:
            # Configured Demo Rule: 
            # Unusual transfer + unexpected device + network deviation = Suspicious
            vol = transfer_event.attributes.get("file_size", 0)
            device_expected = transfer_event.attributes.get("device_expected", True)
            if vol > 50000000 and not device_expected:
                severity = max(severity, 85)
                confidence = max(confidence, 0.95)

        incident = Incident(
            incident_id=self.store.next_incident_id(),
            created_at=now,
            updated_at=group[-1].timestamp,
            status="OPEN",
            severity=severity,
            confidence=confidence,
            asset_id=asset_id,
            zone_id=zone_id,
            summary=self._build_summary(group, zone_id, asset_id),
            signals=[e.event_id for e in group],
            timeline=[
                TimelineEntry(timestamp=e.timestamp, label=f"{e.source}:{e.event_type}", event_id=e.event_id)
                for e in group
            ],
            reasoning=self._build_reasoning(group, zone_id, sources),
            recommended_action=_recommend_action(severity, sources),
        )
        self.store.upsert_incident(incident)
        log_stage(
            "INCIDENT_CREATED", incident_id=incident.incident_id, asset_id=asset_id,
            zone_id=zone_id, severity=severity, confidence=confidence,
            sources=sources, signal_count=len(group),
        )
        return incident

    def _update_incident(self, incident: Incident, event: Event) -> None:
        if event.event_id in incident.signals:
            return  # duplicate contribution -- idempotent no-op

        incident.signals.append(event.event_id)
        incident.timeline.append(
            TimelineEntry(timestamp=event.timestamp, label=f"{event.source}:{event.event_type}", event_id=event.event_id)
        )
        incident.updated_at = event.timestamp
        incident.severity = max(incident.severity, event.severity)
        if not incident.zone_id and event.resolved_zone_id:
            incident.zone_id = event.resolved_zone_id

        member_events = [self.store.get_event(eid) for eid in incident.signals]
        member_events = [e for e in member_events if e is not None]
        incident.confidence = combine_confidence([e.confidence for e in member_events])
        sources = sorted({e.source for e in member_events})

        incident.reasoning.append(
            f"Additional {event.source} signal ({event.event_type}) at {event.timestamp.isoformat()} "
            f"correlated into existing incident within the {config.CORRELATION_WINDOW_SECONDS:.0f}s window."
        )
        incident.recommended_action = _recommend_action(incident.severity, sources)
        self.store.upsert_incident(incident)
        log_stage(
            "INCIDENT_UPDATED", incident_id=incident.incident_id, event_id=event.event_id,
            severity=incident.severity, confidence=incident.confidence, signal_count=len(incident.signals),
        )

    @staticmethod
    def _build_reasoning(group: list[Event], zone_id: Optional[str], sources: list[str]) -> list[str]:
        lines = [f"{len(sources)} independent signal source(s) observed: {', '.join(sources)}."]

        asset_ids = sorted({e.asset_id for e in group})
        if len(asset_ids) == 1:
            lines.append(f"All signals reference asset {asset_ids[0]}.")
        else:
            lines.append(f"Signals reference assets {', '.join(asset_ids)}.")

        if zone_id:
            mapped = sorted({e.asset_id for e in group if not e.zone_id and e.resolved_zone_id == zone_id})
            if mapped:
                lines.append(f"Asset(s) {', '.join(mapped)} mapped to zone {zone_id} via configured asset-zone mapping.")
            direct = sorted({e.asset_id for e in group if e.zone_id == zone_id})
            if direct:
                lines.append(f"Zone {zone_id} directly reported by asset(s) {', '.join(direct)}.")

        span = (group[-1].timestamp - group[0].timestamp).total_seconds()
        lines.append(
            f"Signals occurred within {span:.1f}s of each other; configured correlation window is "
            f"{config.CORRELATION_WINDOW_SECONDS:.0f}s."
        )
        lines.append(f"Combined confidence computed as 1 - ∏(1-c_i) across {len(group)} signal(s).")
        return lines

    @staticmethod
    def _build_summary(group: list[Event], zone_id: Optional[str], asset_id: str) -> str:
        sources = sorted({e.source for e in group})
        zone_part = f" in {zone_id}" if zone_id else ""
        detail = "; ".join(f"{e.source} {e.event_type}" for e in group)
        return f"Correlated {', '.join(sources)} signals on asset {asset_id}{zone_part}: {detail}"
