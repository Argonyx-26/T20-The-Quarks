import { Link } from "react-router-dom";
import type { Incident, IncidentStatus, Source } from "../types";
import { formatClock, formatConfidence, severityBand, severityBandColor, severityBandLabel } from "../format";
import { sourceColor, sourceLabel } from "../theme";
import { Panel } from "./Panel";
import { SeverityBar } from "./atoms";

interface Props {
  incidents: Incident[];
  selected: Incident | null;
  onSelect: (incident: Incident) => void;
  onSetStatus: (incidentId: string, status: IncidentStatus) => void;
  justUpdatedId: string | null;
  totalEvents: number;
  sensorsSeen: number;
}

const STATUS_COLOR: Record<IncidentStatus, string> = {
  OPEN: "#CB514F",
  ACKNOWLEDGED: "#B9842D",
  RESOLVED: "#3D9270",
};

function sourcesInIncident(incident: Incident): Source[] {
  const set = new Set<Source>();
  for (const t of incident.timeline) {
    const src = t.label.split(":")[0] as Source;
    if (src === "vision" || src === "endpoint" || src === "network") set.add(src);
  }
  return Array.from(set);
}

export function IncidentPanel({ incidents, selected, onSelect, onSetStatus, justUpdatedId, totalEvents, sensorsSeen }: Props) {
  if (incidents.length === 0 || !selected) {
    return (
      <Panel title="Active Incident" className="flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <div className="h-2 w-2 animate-pulse_dot rounded-full bg-status-ok" />
          <p className="text-[13px] font-medium text-ink">No active incident</p>
          <p className="max-w-[280px] text-[12px] text-ink-faint">
            SENTRIX is monitoring {sensorsSeen} sensor source{sensorsSeen === 1 ? "" : "s"} and has observed {totalEvents} event
            {totalEvents === 1 ? "" : "s"}. An incident is created only when independent signals corroborate on the same asset
            or zone.
          </p>
          <p className="mt-1 font-mono text-[10.5px] tracking-wide text-ink-faint">SYSTEM READY</p>
        </div>
      </Panel>
    );
  }

  const band = severityBand(selected.severity);
  const sources = sourcesInIncident(selected);
  const flashing = justUpdatedId === selected.incident_id;

  return (
    <Panel
      title="Active Incident"
      right={
        incidents.length > 1 ? (
          <div className="flex gap-1">
            {incidents.map((i) => (
              <button
                key={i.incident_id}
                onClick={() => onSelect(i)}
                className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] ${
                  i.incident_id === selected.incident_id
                    ? "border-ink-faint text-ink"
                    : "border-line text-ink-faint hover:text-ink-muted"
                }`}
              >
                {i.incident_id}
              </button>
            ))}
          </div>
        ) : undefined
      }
      className={`flex-1 ${flashing ? "animate-flash" : ""}`}
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/incident/${selected.incident_id}`}
                className="font-mono text-[13px] font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                title="Open full incident detail"
              >
                {selected.incident_id}
              </Link>
              <span
                className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wide"
                style={{ borderColor: `${STATUS_COLOR[selected.status]}55`, color: STATUS_COLOR[selected.status], backgroundColor: `${STATUS_COLOR[selected.status]}14` }}
              >
                {selected.status}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-muted">{selected.summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-ink-faint">Severity</span>
              <span className="font-mono font-medium" style={{ color: severityBandColor[band] }}>
                {selected.severity} · {severityBandLabel[band]}
              </span>
            </div>
            <SeverityBar severity={selected.severity} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-ink-faint">Confidence</span>
              <span className="font-mono font-medium text-ink">{formatConfidence(selected.confidence)}</span>
            </div>
            <SeverityBar severity={selected.confidence * 100} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line-soft pt-3 text-[12px]">
          <Field label="Asset" value={selected.asset_id} mono />
          <Field label="Zone" value={selected.zone_id ?? "unresolved"} mono />
          <Field label="Signals" value={String(selected.signals.length)} mono />
          <Field label="Created" value={formatClock(selected.created_at)} mono />
        </div>

        <div>
          <span className="text-[11px] text-ink-faint">Source diversity</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-sm border px-1.5 py-0.5 text-[10px] font-medium"
                style={{ borderColor: `${sourceColor[s]}55`, color: sourceColor[s], backgroundColor: `${sourceColor[s]}14` }}
              >
                {sourceLabel[s]}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-line-soft pt-3">
          <span className="text-[11px] text-ink-faint">Recommended action</span>
          <p className="mt-1 text-[12.5px] leading-snug text-ink">{selected.recommended_action}</p>
        </div>

        <div className="mt-auto flex gap-2 border-t border-line-soft pt-3">
          <button
            disabled={selected.status !== "OPEN"}
            onClick={() => onSetStatus(selected.incident_id, "ACKNOWLEDGED")}
            className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:border-amber/50 hover:text-amber disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
          >
            Acknowledge
          </button>
          <button
            disabled={selected.status === "RESOLVED"}
            onClick={() => onSetStatus(selected.incident_id, "RESOLVED")}
            className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:border-status-ok/50 hover:text-status-ok disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
          >
            Resolve
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-faint">{label}</span>
      <span className={`${mono ? "font-mono" : ""} font-medium text-ink`}>{value}</span>
    </div>
  );
}
