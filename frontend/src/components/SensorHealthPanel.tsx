import { useEffect, useState } from "react";
import type { HealthResponse, Source } from "../types";
import { sensorStatusColor, sensorStatusLabel, sourceLabel } from "../theme";
import { formatRelative } from "../format";
import { Panel } from "./Panel";
import { StatusDot } from "./atoms";

const SOURCES: Source[] = ["vision", "endpoint", "network"];

export function SensorHealthPanel({ health }: { health: HealthResponse | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Panel title="Source Health" noPadding>
      <div className="flex flex-col divide-y divide-line-soft">
        {SOURCES.map((s) => {
          const entry = health?.sensors[s];
          const status = entry?.status ?? "never_seen";
          const color = sensorStatusColor[status];
          return (
            <div key={s} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <StatusDot color={color} pulse={status === "stale"} />
                <span className="text-[13.5px] font-semibold text-ink">{sourceLabel[s]}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-semibold" style={{ color }}>
                  {sensorStatusLabel[status]}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">{formatRelative(entry?.last_seen ?? null, now)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
