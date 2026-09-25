import type { Incident, SentrixEvent } from "../types";
import { Panel } from "./Panel";

interface Props {
  incident: Incident | null;
  events: SentrixEvent[];
  onSelectEvent: (event: SentrixEvent) => void;
}

export function ReasoningPanel({ incident, events, onSelectEvent }: Props) {
  if (!incident) {
    return (
      <Panel title="Why Correlated" className="flex-1">
        <div className="flex h-full items-center justify-center">
          <p className="text-[12px] text-ink-faint">Deterministic fusion reasoning appears here once an incident exists.</p>
        </div>
      </Panel>
    );
  }

  const signalEvents = incident.signals
    .map((id) => events.find((e) => e.event_id === id))
    .filter((e): e is SentrixEvent => !!e);

  return (
    <Panel title="Why Correlated" noPadding className="flex-1">
      <div className="h-full overflow-y-auto p-3">
        <ul className="flex flex-col gap-1.5">
          {incident.reasoning.map((line, idx) => (
            <li key={idx} className="flex gap-2 text-[12.5px] leading-snug text-ink">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-status-ok" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {signalEvents.length > 0 && (
          <div className="mt-4 border-t border-line-soft pt-3">
            <span className="text-[11px] text-ink-faint">Contributing signals</span>
            <div className="mt-2 flex flex-col gap-1.5">
              {signalEvents.map((e) => (
                <button
                  key={e.event_id}
                  onClick={() => onSelectEvent(e)}
                  className="flex items-center justify-between rounded-sm border border-line px-2 py-1.5 text-left text-[11.5px] text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
                >
                  <span className="truncate font-mono">{e.event_id}</span>
                  <span className="ml-2 shrink-0 text-ink-faint">inspect</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
