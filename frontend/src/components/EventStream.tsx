import { useEffect, useRef } from "react";
import type { SentrixEvent } from "../types";
import { sourceColor, sourceLabel } from "../theme";
import { formatClock, severityBand, severityBandColor } from "../format";
import { Panel } from "./Panel";

interface Props {
  events: SentrixEvent[];
  onSelect: (event: SentrixEvent) => void;
  selectedId: string | null;
}

function humanize(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function EventStream({ events, onSelect, selectedId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return (
    <Panel
      title="Live Event Stream"
      right={<span className="font-mono text-[10px] text-ink-faint">{events.length} events</span>}
      noPadding
      className="flex-1"
    >
      {events.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <div>
            <div className="mx-auto mb-2 h-1.5 w-1.5 animate-pulse_dot rounded-full bg-status-ok" />
            <p className="text-[12.5px] text-ink-faint">
              Waiting for signals — vision, endpoint and network events will appear here as they arrive.
            </p>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} onScroll={handleScroll} className="h-full divide-y divide-line-soft overflow-y-auto">
          {events.map((e) => {
            const band = severityBand(e.severity);
            const selected = e.event_id === selectedId;
            const color = sourceColor[e.source];
            return (
              <button
                key={e.event_id}
                onClick={() => onSelect(e)}
                className={`animate-reveal flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors hover:bg-base-600/50 ${
                  selected ? "bg-base-600" : ""
                }`}
                style={{ borderColor: selected ? color : "transparent" }}
              >
                <span className="w-[64px] shrink-0 font-mono text-[10.5px] text-ink-faint">{formatClock(e.timestamp)}</span>
                <span className="flex w-[74px] shrink-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[10px] font-semibold tracking-wide" style={{ color }}>
                    {sourceLabel[e.source]}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink" title={humanize(e.event_type)}>
                  {humanize(e.event_type)}
                </span>
                <span className="hidden w-[70px] shrink-0 font-mono text-[11px] text-ink-muted sm:inline">{e.asset_id}</span>
                <span className="hidden w-[24px] shrink-0 text-right font-mono text-[11px] font-semibold md:inline" style={{ color: severityBandColor[band] }}>
                  {e.severity}
                </span>
                <span className="hidden w-[36px] shrink-0 text-right font-mono text-[10.5px] text-ink-faint md:inline">
                  {Math.round(e.confidence * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
