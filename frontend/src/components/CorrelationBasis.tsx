import type { FusionCriterion, Incident, MissionControlSnapshot, NormalizedEvent } from "../domain";
import { criterionColor, criterionLabel } from "../theme";
import { humanizeEventType } from "../format";
import { Panel } from "./Panel";

interface Props {
  incident: Incident | null;
  lastEvaluation: MissionControlSnapshot["lastEvaluation"];
  events: NormalizedEvent[];
  onSelectEvent: (event: NormalizedEvent) => void;
}

function CriterionRow({ criterion }: { criterion: FusionCriterion }) {
  const color = criterionColor[criterion.status];
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <span className="text-[12.5px] font-medium text-ink">{criterion.label}</span>
        {criterion.value !== undefined && (
          <span className="ml-2 font-mono text-[11.5px] text-ink-muted">{criterion.value}</span>
        )}
        {criterion.detail && <p className="mt-0.5 max-w-[42ch] text-[11px] leading-snug text-ink-faint">{criterion.detail}</p>}
      </div>
      <span
        className="mt-0.5 shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide"
        style={{ borderColor: `${color}55`, color, backgroundColor: `${color}14` }}
      >
        {criterionLabel[criterion.status]}
      </span>
    </div>
  );
}

export function CorrelationBasis({ incident, lastEvaluation, events, onSelectEvent }: Props) {
  const criteria = incident ? incident.reasoning : lastEvaluation?.criteria;
  const outcome: "incident" | "no_incident" | null = incident ? "incident" : lastEvaluation ? lastEvaluation.outcome : null;

  if (!criteria || criteria.length === 0) {
    return (
      <Panel title="Correlation Basis" className="flex-1">
        <div className="flex h-full items-center justify-center">
          <p className="max-w-[30ch] text-center text-[12px] text-ink-faint">
            Deterministic fusion reasoning appears here once signals are evaluated for correlation.
          </p>
        </div>
      </Panel>
    );
  }

  const signalIds = incident ? incident.signalIds : lastEvaluation?.signalIds ?? [];
  const signalEvents = incident
    ? incident.timeline.filter((e) => signalIds.includes(e.eventId))
    : signalIds.map((id) => events.find((e) => e.eventId === id)).filter((e): e is NormalizedEvent => !!e);

  const resultBanner =
    outcome === "no_incident"
      ? { text: "NO INCIDENT CREATED — EVENTS KEPT SEPARATE", color: "#B9842D" }
      : outcome === "incident"
        ? { text: `${signalIds.length} SIGNAL${signalIds.length === 1 ? "" : "S"} MERGED INTO INCIDENT`, color: "#168B84" }
        : null;

  return (
    <Panel title="Correlation Basis" noPadding className="flex-1">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex flex-col">
          {criteria.map((c) => (
            <CriterionRow key={c.key} criterion={c} />
          ))}
        </div>

        {resultBanner && (
          <div
            className="mx-3 mt-3 rounded-sm border px-3 py-2 text-center font-mono text-[11px] font-semibold tracking-wide"
            style={{ borderColor: `${resultBanner.color}45`, color: resultBanner.color, backgroundColor: `${resultBanner.color}12` }}
          >
            {resultBanner.text}
          </div>
        )}

        {signalEvents.length > 0 && (
          <div className="mt-3 border-t border-line-soft px-4 py-3">
            <span className="text-[11px] text-ink-faint">Contributing signals</span>
            <div className="mt-2 flex flex-col gap-1.5">
              {signalEvents.map((e) => (
                <button
                  key={e.eventId}
                  onClick={() => onSelectEvent(e)}
                  className="flex items-center justify-between rounded-sm border border-line px-2 py-1.5 text-left text-[11.5px] text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
                >
                  <span className="truncate">{humanizeEventType(e.eventType)}</span>
                  <span className="ml-2 shrink-0 font-mono text-ink-faint">inspect</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
