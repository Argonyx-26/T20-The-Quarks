import { Link } from "react-router-dom";
import type { Incident, IncidentStatus, MissionControlSnapshot, Source } from "../domain";
import { formatConfidence, formatIp, severityBand, severityBandColor, severityBandLabel } from "../format";
import { incidentStatusColor, incidentStatusLabel, sourceColor, sourceLabel } from "../theme";
import { Panel } from "./Panel";
import { SeverityBar } from "./atoms";

interface Props {
  incidents: Incident[];
  selected: Incident | null;
  onSelect: (incident: Incident) => void;
  onSetStatus: (incidentId: string, status: IncidentStatus) => void;
  justUpdatedId: string | null;
  lastEvaluation: MissionControlSnapshot["lastEvaluation"];
  sourcesOnline: number;
  totalEvents: number;
}

function sourcesInIncident(incident: Incident): Source[] {
  return Array.from(new Set(incident.timeline.map((e) => e.source)));
}

export function ActiveIncidentPanel({ incidents, selected, onSelect, onSetStatus, justUpdatedId, lastEvaluation, sourcesOnline, totalEvents }: Props) {
  if (!selected) {
    // A mismatch was just evaluated: this is a successful outcome, not an
    // absence of one -- give it real visual presence, framed as success.
    if (lastEvaluation?.outcome === "no_incident") {
      return (
        <Panel title="Active Incident / Live Context" className="flex-1">
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="rounded-sm border border-amber/45 bg-amber/10 px-2 py-1 font-mono text-[10.5px] font-bold tracking-wide text-amber">
              CONTEXT MISMATCH
            </span>
            <p className="text-[16px] font-semibold text-ink">No incident created</p>
            <p className="max-w-[320px] text-[12.5px] leading-relaxed text-ink-faint">
              Signals from {lastEvaluation.deviceName ?? lastEvaluation.deviceId ?? "a device"} were evaluated together and did not agree closely
              enough to correlate. They were kept as separate, unrelated events — exactly as designed.
            </p>
            <p className="mt-1 font-mono text-[10.5px] tracking-wide text-ink-faint">
              See Correlation Basis below for the full match / mismatch breakdown.
            </p>
          </div>
        </Panel>
      );
    }

    return (
      <Panel title="Active Incident / Live Context" className="flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div className="h-2.5 w-2.5 animate-pulse_dot rounded-full bg-status-ok" />
          <p className="text-[17px] font-semibold text-ink">No active incident</p>
          <p className="max-w-[300px] text-[12.5px] leading-relaxed text-ink-faint">
            Monitoring {sourcesOnline} source{sourcesOnline === 1 ? "" : "s"} — {totalEvents} event{totalEvents === 1 ? "" : "s"} observed. An
            incident is created only when independent signals corroborate on the same device or zone.
          </p>
          <p className="mt-1 font-mono text-[10.5px] tracking-wide text-status-ok">SYSTEM READY</p>
        </div>
      </Panel>
    );
  }

  const band = severityBand(selected.severity ?? 0);
  const sources = sourcesInIncident(selected);
  const flashing = justUpdatedId === selected.incidentId;
  const statusColor = incidentStatusColor[selected.status];

  return (
    <Panel
      title="Active Incident / Live Context"
      right={
        incidents.length > 1 ? (
          <div className="flex gap-1">
            {incidents.map((i) => (
              <button
                key={i.incidentId}
                onClick={() => onSelect(i)}
                className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] ${
                  i.incidentId === selected.incidentId ? "border-ink-faint text-ink" : "border-line text-ink-faint hover:text-ink-muted"
                }`}
              >
                {i.incidentId}
              </button>
            ))}
          </div>
        ) : undefined
      }
      noPadding
      className={`flex-1 ${flashing ? "animate-flash" : ""}`}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-l-2 px-4 py-4" style={{ borderColor: statusColor }}>
          <span className="font-mono text-[11px] font-bold tracking-[0.1em]" style={{ color: statusColor }}>
            {incidentStatusLabel[selected.status]}
          </span>
          <Link
            to={`/incident/${selected.incidentId}`}
            className="mt-1 block font-mono text-[26px] font-bold leading-tight text-ink hover:text-teal-dark"
            title="Open full incident detail"
          >
            {selected.incidentId}
          </Link>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">{selected.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-line-soft px-4 py-3">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[11px] text-ink-faint">Severity</span>
              <span className="font-mono text-[15px] font-bold" style={{ color: severityBandColor[band] }}>
                {selected.severity ?? "—"}
              </span>
            </div>
            <SeverityBar severity={selected.severity ?? 0} />
            <span className="mt-1 block text-[10.5px] text-ink-faint">{severityBandLabel[band]}</span>
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[11px] text-ink-faint">Confidence</span>
              <span className="font-mono text-[15px] font-bold text-teal-dark">
                {selected.confidence !== undefined ? formatConfidence(selected.confidence) : "—"}
              </span>
            </div>
            <SeverityBar severity={(selected.confidence ?? 0) * 100} />
            <span className="mt-1 block text-[10.5px] text-ink-faint">of combined signals</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line-soft px-4 py-3 text-[12px]">
          <Field label="Device" value={selected.deviceName ?? selected.deviceId ?? "unknown"} mono />
          <Field label="IP" value={formatIp(selected.ipAddress)} mono faint={!selected.ipAddress} />
          <Field label="Zone" value={selected.zoneId ?? "unresolved"} mono />
          <Field label="Signals" value={String(selected.signalIds.length)} mono />
        </div>

        <div className="border-t border-line-soft px-4 py-3">
          <span className="text-[11px] text-ink-faint">Source diversity</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-sm border px-1.5 py-0.5 text-[10.5px] font-medium"
                style={{ borderColor: `${sourceColor[s]}55`, color: sourceColor[s], backgroundColor: `${sourceColor[s]}14` }}
              >
                {sourceLabel[s]}
              </span>
            ))}
          </div>
        </div>

        {selected.recommendedAction && (
          <div className="border-t border-line-soft px-4 py-3">
            <span className="text-[11px] text-ink-faint">Recommended action</span>
            <p className="mt-1 text-[12.5px] leading-snug text-ink">{selected.recommendedAction}</p>
          </div>
        )}

        <div className="mt-auto flex gap-2 border-t border-line-soft px-4 py-3">
          <button
            disabled={selected.status !== "open"}
            onClick={() => onSetStatus(selected.incidentId, "acknowledged")}
            className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:border-amber/50 hover:text-amber disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
          >
            Acknowledge
          </button>
          <button
            disabled={selected.status === "resolved"}
            onClick={() => onSetStatus(selected.incidentId, "resolved")}
            className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:border-status-ok/50 hover:text-status-ok disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
          >
            Resolve
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, value, mono, faint }: { label: string; value: string; mono?: boolean; faint?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-faint">{label}</span>
      <span className={`${mono ? "font-mono" : ""} font-medium ${faint ? "italic text-ink-faint" : "text-ink"}`}>{value}</span>
    </div>
  );
}
