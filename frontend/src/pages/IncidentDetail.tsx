import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMissionControlData } from "../hooks/useMissionControlData";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { CorrelationBasis } from "../components/CorrelationBasis";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { SeverityBar, SourceTag } from "../components/atoms";
import { formatClock, formatConfidence, formatIp, severityBand, severityBandColor, severityBandLabel } from "../format";
import { incidentStatusColor, incidentStatusLabel } from "../theme";
import type { NormalizedEvent, Source } from "../domain";

function sourcesInIncident(timeline: { source: Source }[]): Source[] {
  return Array.from(new Set(timeline.map((t) => t.source)));
}

export default function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const mc = useMissionControlData();
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);

  if (mc.status === "booting") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-800">
        <span className="text-[11px] text-ink-faint">Connecting to fusion backend…</span>
      </div>
    );
  }

  if (mc.status === "error" || !mc.snapshot) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-base-800 text-center">
        <p className="font-mono text-[12px] text-ink-faint">BACKEND UNAVAILABLE</p>
        <Link to="/mission-control" className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-ink-muted hover:border-ink-faint hover:text-ink">
          ← Back to Mission Control
        </Link>
      </div>
    );
  }

  const incident = mc.snapshot.incidents.find((i) => i.incidentId === incidentId) ?? null;

  if (!incident) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-base-800 text-center">
        <p className="font-mono text-[12px] text-ink-faint">
          {incidentId} {mc.snapshot.incidents.length > 0 ? "was not found." : "— no incidents in this session yet."}
        </p>
        <Link to="/mission-control" className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-ink-muted hover:border-ink-faint hover:text-ink">
          ← Back to Mission Control
        </Link>
      </div>
    );
  }

  const band = severityBand(incident.severity ?? 0);
  const sources = sourcesInIncident(incident.timeline);
  const statusColor = incidentStatusColor[incident.status];

  return (
    <div className="min-h-screen bg-base-800 text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-base-700 px-5">
        <div className="flex items-center gap-4">
          <Link to="/mission-control" className="font-mono text-[11px] text-ink-faint hover:text-ink">
            ← MISSION CONTROL
          </Link>
          <span className="h-4 w-px bg-line" />
          <span className="font-mono text-[13px] font-semibold text-ink">{incident.incidentId}</span>
          <span
            className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wide"
            style={{ borderColor: `${statusColor}55`, color: statusColor, backgroundColor: `${statusColor}14` }}
          >
            {incidentStatusLabel[incident.status]}
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-ink-faint">{formatClock(incident.updatedAt ?? incident.createdAt)} updated</span>
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
                    {incident.severity ?? "—"}
                  </span>
                  <span className="text-[11px] text-ink-faint">{severityBandLabel[band]}</span>
                </div>
                <div className="mt-1.5">
                  <SeverityBar severity={incident.severity ?? 0} />
                </div>
              </div>
              <div>
                <span className="text-[11px] text-ink-faint">Confidence</span>
                <div className="mt-1 font-mono text-[15px] font-medium text-ink">
                  {incident.confidence !== undefined ? formatConfidence(incident.confidence) : "—"}
                </div>
                <div className="mt-1.5">
                  <SeverityBar severity={(incident.confidence ?? 0) * 100} />
                </div>
              </div>
              <div>
                <span className="text-[11px] text-ink-faint">Device</span>
                <div className="mt-1 font-mono text-[13px] font-medium text-ink">{incident.deviceName ?? incident.deviceId ?? "unknown"}</div>
              </div>
              <div>
                <span className="text-[11px] text-ink-faint">IP / Zone</span>
                <div className="mt-1 font-mono text-[13px] font-medium text-ink">
                  {formatIp(incident.ipAddress)} · {incident.zoneId ?? "unresolved"}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
              <span className="mr-1 text-[11px] text-ink-faint">Source diversity</span>
              {sources.map((s) => (
                <SourceTag key={s} source={s} />
              ))}
            </div>

            {incident.recommendedAction && (
              <div className="mt-5 border-t border-line-soft pt-4">
                <span className="text-[11px] text-ink-faint">Recommended action</span>
                <p className="mt-1 text-[13.5px] leading-snug text-ink">{incident.recommendedAction}</p>
              </div>
            )}

            <div className="mt-5 flex gap-2 border-t border-line-soft pt-4">
              <button
                disabled={incident.status !== "open"}
                onClick={() => mc.setIncidentStatus(incident.incidentId, "acknowledged")}
                className="rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-amber/50 hover:text-amber disabled:cursor-not-allowed disabled:opacity-40"
              >
                Acknowledge
              </button>
              <button
                disabled={incident.status === "resolved"}
                onClick={() => mc.setIncidentStatus(incident.incidentId, "resolved")}
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
          <CorrelationBasis incident={incident} lastEvaluation={undefined} events={mc.snapshot.events} onSelectEvent={setSelectedEvent} />
        </div>
      </main>

      {selectedEvent && <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
