import { useEffect, useState } from "react";
import type { Source, SourceHealth } from "../domain";
import { sourceHealthColor, sourceHealthLabel, sourceLabel } from "../theme";
import { formatRelative } from "../format";
import { Panel } from "./Panel";
import { StatusDot } from "./atoms";

const SOURCES: Source[] = ["vision", "endpoint", "network"];

export function SourceHealthPanel({ sourceHealth }: { sourceHealth: SourceHealth[] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Panel title="Source Health" noPadding>
      <div className="flex flex-col divide-y divide-line-soft">
        {SOURCES.map((s) => {
          const entry = sourceHealth.find((h) => h.source === s);
          const status = entry?.status ?? "unknown";
          const color = sourceHealthColor[status];
          return (
            <div key={s} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <StatusDot color={color} pulse={status === "degraded"} />
                <span className="text-[13.5px] font-semibold text-ink">{sourceLabel[s]}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-semibold" style={{ color }}>
                  {sourceHealthLabel[status]}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">{formatRelative(entry?.lastSeen ?? null, now)}</span>
                {entry?.message && <span className="mt-0.5 max-w-[160px] text-right text-[10px] text-ink-faint">{entry.message}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
