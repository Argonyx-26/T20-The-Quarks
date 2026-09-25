import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMissionControl } from "../useMissionControl";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { ReasoningPanel } from "../components/ReasoningPanel";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { SeverityBar, SourceTag } from "../components/atoms";
import { formatClock, formatConfidence, severityBand, severityBandColor, severityBandLabel } from "../format";
import type { IncidentStatus, SentrixEvent, Source } from "../types";

const STATUS_COLOR: Record<IncidentStatus, string> = {
  OPEN: "#CB514F",
  ACKNOWLEDGED: "#B9842D",
  RESOLVED: "#3D9270",
};

function sourcesInIncident(timeline: { label: string }[]): Source[] {
  const set = new Set<Source>();
  for (const t of timeline) {
    const src = t.label.split(":")[0] as Source;
    if (src === "vision" || src === "endpoint" || src === "network") set.add(src);
  }
  return Array.from(set);
}

export default function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const mc = useMissionControl();
  const [selectedEvent, setSelectedEvent] = useState<SentrixEvent | null>(null);

  if (mc.loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-800">
        <span className="text-[11px] text-ink-faint">Connecting to fusion backend…</span>
      </div>
    );
  }

  const incident = mc.incidents.find((i) => i.incident_id === incidentId) ?? null;

  if (!incident) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-base-800 text-center">
        <p className="font-mono text-[12px] text-ink-faint">
          {incidentId} {mc.incidents.length > 0 ? "was not found." : "— no incidents in this session yet."}
        </p>
        <Link
          to="/mission-control"
          className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-ink-muted hover:border-ink-faint hover:text-ink"
        >
          ← Back to Mission Control
        </Link>
      </div>
    );
  }

  const band = severityBand(incident.severity);
  const sources = sourcesInIncident(incident.timeline);

  return (
    <div className="min-h-screen bg-base-800 text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-base-700 px-5">
        <div className="flex items-center gap-4">
          <Link to="/mission-control" className="font-mono text-[11px] text-ink-faint hover:text-ink">
            ← MISSION CONTROL
          </Link>
          <span className="h-4 w-px bg-line" />
          <span className="font-mono text-[13px] font-semibold text-ink">{incident.incident_id}</span>
          <span
            className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wide"
            style={{
              borderColor: `${STATUS_COLOR[incident.status]}55`,
              color: STATUS_COLOR[incident.status],
              backgroundColor: `${STATUS_COLOR[incident.status]}14`,
            }}
          >
            {incident.status}
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-ink-faint">{formatClock(incident.updated_at)} updated</span>
      </header>

      <main className="mx-auto grid max-w-[1200px] gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-4">
          <section className="border border-line bg-base-700 p-5">
            <p className="max-w-[62ch] text-[16px] leading-snug text-ink">{incident.summary}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-[11px] text-ink-faint">Severity</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-[15px] font-medium" style={{ color: severityBandColor[band] }}>
                    {incident.severity}
                  </span>
                  <span className="text-[11px] text-ink-faint">{severityBandLabel[band]}</span>
                </div>
                <div className="mt-1.5">
                  <SeverityBar severity={incident.severity} />
                </div>
              </div>
              <div>
                <span className="text-[11px] text-ink-faint">Confidence</span>
                <div className="mt-1 font-mono text-[15px] font-medium text-ink">
                  {formatConfidence(incident.confidence)}
                </div>
                <div className="mt-1.5">
                  <SeverityBar severity={incident.confidence * 100} />
                </div>
              </div>
              <div>
                <span className="text-[11px] text-ink-faint">Asset</span>
                <div className="mt-1 font-mono text-[13px] font-medium text-ink">{incident.asset_id}</div>
              </div>
              <div>
                <span className="text-[11px] text-ink-faint">Zone</span>
                <div className="mt-1 font-mono text-[13px] font-medium text-ink">{incident.zone_id ?? "unresolved"}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
              <span className="mr-1 text-[11px] text-ink-faint">Source diversity</span>
              {sources.map((s) => (
                <SourceTag key={s} source={s} />
              ))}
            </div>

            <div className="mt-5 border-t border-line-soft pt-4">
              <span className="text-[11px] text-ink-faint">Recommended action</span>
              <p className="mt-1 text-[13.5px] leading-snug text-ink">{incident.recommended_action}</p>
            </div>

            <div className="mt-5 flex gap-2 border-t border-line-soft pt-4">
              <button
                disabled={incident.status !== "OPEN"}
                onClick={() => mc.setIncidentStatus(incident.incident_id, "ACKNOWLEDGED")}
                className="rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-amber/50 hover:text-amber disabled:cursor-not-allowed disabled:opacity-40"
              >
                Acknowledge
              </button>
              <button
                disabled={incident.status === "RESOLVED"}
                onClick={() => mc.setIncidentStatus(incident.incident_id, "RESOLVED")}
                className="rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-status-ok/50 hover:text-status-ok disabled:cursor-not-allowed disabled:opacity-40"
              >
                Resolve
              </button>
            </div>
          </section>

          <div className="h-[280px] shrink-0">
            <IncidentTimeline incident={incident} />
          </div>
        </div>

        <div className="h-[420px] lg:h-auto">
          <ReasoningPanel incident={incident} events={mc.events} onSelectEvent={setSelectedEvent} />
        </div>
      </main>

      {selectedEvent && <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
