import type { Incident, NormalizedEvent, Source } from "../domain";
import { formatClock, humanizeEventType } from "../format";
import { sourceColor } from "../theme";
import { Panel } from "./Panel";

type Kind = "signal" | "fusion" | "incident";

interface Entry {
  timestamp: string;
  label: string;
  source: Source | null;
  kind: Kind;
}

export function IncidentTimeline({ incident }: { incident: Incident | null }) {
  if (!incident) {
    return (
      <Panel title="Incident Timeline" className="flex-1">
        <div className="flex h-full items-center justify-center">
          <p className="text-[12px] text-ink-faint">Timeline will populate once signals correlate into an incident.</p>
        </div>
      </Panel>
    );
  }

  const entries: Entry[] = [
    ...incident.timeline.map(
      (e: NormalizedEvent): Entry => ({
        timestamp: e.timestamp,
        label: humanizeEventType(e.eventType),
        source: e.source,
        kind: "signal",
      }),
    ),
    { timestamp: incident.createdAt, label: "Context window satisfied", source: null, kind: "fusion" as const },
    { timestamp: incident.createdAt, label: `${incident.incidentId} created`, source: null, kind: "incident" as const },
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || (a.kind === "fusion" ? -1 : 1));

  return (
    <Panel title="Incident Timeline" noPadding className="flex-1">
      <div className="h-full overflow-y-auto px-3 py-3">
        <ol className="relative border-l border-line pl-4">
          {entries.map((e, idx) => {
            const color = e.source ? sourceColor[e.source] : e.kind === "incident" ? "#CB514F" : "#B9842D";
            const kindLabel = e.kind === "fusion" ? "fusion" : e.kind === "incident" ? "incident" : e.source;
            return (
              <li key={idx} className="animate-reveal mb-3 last:mb-0">
                {e.kind === "signal" ? (
                  <span className="absolute -left-[4.5px] mt-1 h-2 w-2 rounded-full ring-2 ring-base-700" style={{ backgroundColor: color }} />
                ) : (
                  <span
                    className="absolute -left-[5.5px] mt-[3px] h-2.5 w-2.5 rotate-45 ring-2 ring-base-700"
                    style={{ backgroundColor: color }}
                  />
                )}
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-ink-faint">{formatClock(e.timestamp)}</span>
                  {kindLabel && (
                    <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color }}>
                      {kindLabel}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[12.5px] leading-snug ${e.kind === "signal" ? "text-ink" : "font-medium"}`}
                  style={e.kind !== "signal" ? { color } : undefined}
                >
                  {e.label}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}
