import { useEffect, useRef } from "react";
import type { SentrixEvent } from "../types";
import { sourceColor } from "../theme";
import { formatClock, severityBand, severityBandColor } from "../format";
import { Panel } from "./Panel";

interface Props {
  events: SentrixEvent[];
  onSelect: (event: SentrixEvent) => void;
  selectedId: string | null;
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
      right={<span className="font-mono text-[10px] text-ink-faint">{events.length}</span>}
      noPadding
      className="flex-1"
    >
      {events.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <p className="text-[12px] text-ink-faint">Waiting for sensor signals&nbsp;&mdash;&nbsp;vision, endpoint and network events will appear here as they arrive.</p>
        </div>
      ) : (
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
          <table className="w-full border-collapse text-left font-mono text-[11.5px]">
            <tbody>
              {events.map((e) => {
                const band = severityBand(e.severity);
                const selected = e.event_id === selectedId;
                return (
                  <tr
                    key={e.event_id}
                    onClick={() => onSelect(e)}
                    className={`cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-base-600/60 ${
                      selected ? "bg-base-600" : ""
                    } animate-reveal`}
                  >
                    <td className="whitespace-nowrap py-1.5 pl-3 pr-2 text-ink-faint">{formatClock(e.timestamp)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                        style={{ backgroundColor: sourceColor[e.source] }}
                      />
                      <span style={{ color: sourceColor[e.source] }}>{e.source}</span>
                    </td>
                    <td className="max-w-[220px] truncate py-1.5 pr-2 font-sans text-ink" title={e.event_type}>
                      {e.event_type}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-ink-muted">{e.asset_id}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-ink-faint">{e.zone_id ?? e.resolved_zone_id ?? "—"}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-right" style={{ color: severityBandColor[band] }}>
                      {e.severity}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 text-right text-ink-faint">
                      {Math.round(e.confidence * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
