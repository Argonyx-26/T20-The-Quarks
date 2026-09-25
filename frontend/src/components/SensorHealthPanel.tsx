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
    <Panel title="Sensor Health">
      <div className="flex flex-col divide-y divide-line-soft">
        {SOURCES.map((s) => {
          const entry = health?.sensors[s];
          const status = entry?.status ?? "never_seen";
          const color = sensorStatusColor[status];
          return (
            <div key={s} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <StatusDot color={color} pulse={status === "stale"} />
                <span className="text-[13px] font-medium text-ink">{sourceLabel[s]}</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[11px] font-medium" style={{ color }}>
                  {sensorStatusLabel[status]}
                </span>
                <span className="w-16 font-mono text-[10px] text-ink-faint">
                  {formatRelative(entry?.last_seen ?? null, now)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
