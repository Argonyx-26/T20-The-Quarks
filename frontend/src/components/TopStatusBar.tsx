import { useEffect, useState } from "react";
import type { ConnState, HealthResponse, Source } from "../types";
import { sensorStatusColor } from "../theme";
import { formatClock } from "../format";
import { StatusDot } from "./atoms";

interface Props {
  health: HealthResponse | null;
  connState: ConnState;
  mode: "LIVE" | "REPLAY";
  openIncidentCount: number;
  maxSeverityOpen: number;
}

const SOURCES: Source[] = ["vision", "endpoint", "network"];

function connLabel(state: ConnState): { text: string; color: string; pulse: boolean } {
  switch (state) {
    case "live":
      return { text: "Connected", color: "#3D9270", pulse: false };
    case "connecting":
      return { text: "Connecting", color: "#B9842D", pulse: true };
    case "reconnecting":
      return { text: "Reconnecting", color: "#B9842D", pulse: true };
    case "disconnected":
      return { text: "Disconnected", color: "#CB514F", pulse: false };
  }
}

export function TopStatusBar({ health, connState, mode, openIncidentCount, maxSeverityOpen }: Props) {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);

  const conn = connLabel(connState);
  const healthyCount = SOURCES.filter((s) => health?.sensors[s]?.status === "ok").length;
  const allHealthy = !!health && healthyCount === SOURCES.length;
  const systemColor = openIncidentCount > 0 ? (maxSeverityOpen >= 80 ? "#CB514F" : "#B9842D") : allHealthy ? "#3D9270" : "#B9842D";
  const systemText = openIncidentCount > 0 ? `${openIncidentCount} active incident${openIncidentCount > 1 ? "s" : ""}` : allHealthy ? "Nominal" : "Degraded";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-base-700 px-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[13px] font-semibold tracking-[0.14em] text-ink">
          SENTRIX
        </span>
        <span className="text-[11px] text-ink-faint">Mission Control</span>
      </div>

      <div className="flex items-center gap-5 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-widest"
            style={{
              borderColor: mode === "LIVE" ? "#3D927055" : "#4779D855",
              color: mode === "LIVE" ? "#3D9270" : "#4779D8",
              backgroundColor: mode === "LIVE" ? "#3D927014" : "#4779D814",
            }}
          >
            {mode}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <StatusDot color={systemColor} pulse={openIncidentCount > 0} />
          <span className="text-ink-muted">System</span>
          <span className="font-medium text-ink">{systemText}</span>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="font-mono text-[11px] text-ink-faint">
            SENSORS {healthyCount}/{SOURCES.length}
          </span>
          <div className="flex items-center gap-2">
            {SOURCES.map((s) => {
              const st = health?.sensors[s]?.status ?? "never_seen";
              return (
                <div key={s} className="flex items-center gap-1" title={`${s}: ${st}`}>
                  <StatusDot color={sensorStatusColor[st]} pulse={st === "stale"} />
                  <span className="font-mono text-[10px] uppercase text-ink-faint">{s.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-ink-faint">Event bus</span>
          <StatusDot color={conn.color} pulse={conn.pulse} />
          <span className="text-ink-muted">{conn.text}</span>
        </div>

        <span className="hidden font-mono text-[11px] text-ink-faint md:inline">{formatClock(now)}</span>
      </div>
    </header>
  );
}
