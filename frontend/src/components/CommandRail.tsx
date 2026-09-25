import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ConnState, HealthResponse, Source } from "../types";
import { sensorStatusColor } from "../theme";
import { formatClock } from "../format";
import { StatusDot } from "./atoms";

interface Props {
  health: HealthResponse | null;
  connState: ConnState;
  mode: "LIVE" | "REPLAY";
  deviceCount: number;
  eventCount: number;
  openIncidentCount: number;
  maxSeverityOpen: number;
}

const SOURCES: Source[] = ["vision", "endpoint", "network"];

function connLabel(state: ConnState): { text: string; color: string; pulse: boolean } {
  switch (state) {
    case "live":
      return { text: "CONNECTED", color: "#3D9270", pulse: false };
    case "connecting":
      return { text: "CONNECTING", color: "#B9842D", pulse: true };
    case "reconnecting":
      return { text: "RECONNECTING", color: "#B9842D", pulse: true };
    case "disconnected":
      return { text: "DISCONNECTED", color: "#CB514F", pulse: false };
  }
}

function Metric({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-4">
      <span className="font-mono text-[22px] font-bold leading-none tracking-tight" style={{ color: color ?? "#121718" }}>
        {value}
      </span>
      <span className="mt-0.5 font-mono text-[9px] font-medium tracking-[0.1em] text-ink-faint">{label}</span>
    </div>
  );
}

export function CommandRail({ health, connState, mode, deviceCount, eventCount, openIncidentCount, maxSeverityOpen }: Props) {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);

  const conn = connLabel(connState);
  const healthyCount = SOURCES.filter((s) => health?.sensors[s]?.status === "ok").length;
  const incidentColor = openIncidentCount === 0 ? "#121718" : maxSeverityOpen >= 80 ? "#C75D56" : "#B9842D";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-base-700 px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[14px] font-bold tracking-[0.16em] text-ink">SENTRIX</span>
          <span className="text-[11px] text-ink-faint">Mission Control</span>
        </div>
        <span
          className="rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-widest"
          style={{
            borderColor: mode === "LIVE" ? "#3D927055" : "#4779D855",
            color: mode === "LIVE" ? "#3D9270" : "#4779D8",
            backgroundColor: mode === "LIVE" ? "#3D927014" : "#4779D814",
          }}
        >
          {mode}
        </span>
      </div>

      <div className="flex h-full items-center divide-x divide-line-soft">
        <Metric value={`${healthyCount}/${SOURCES.length}`} label="SOURCES ONLINE" color={healthyCount === SOURCES.length ? "#3D9270" : "#B9842D"} />
        <Metric value={String(deviceCount).padStart(2, "0")} label="DEVICES" />
        <Metric value={String(eventCount).padStart(2, "0")} label="EVENTS" />
        <Metric value={String(openIncidentCount).padStart(2, "0")} label="INCIDENTS" color={incidentColor} />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 sm:flex">
          {SOURCES.map((s) => {
            const st = health?.sensors[s]?.status ?? "never_seen";
            return <StatusDot key={s} color={sensorStatusColor[st]} pulse={st === "stale"} />;
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot color={conn.color} pulse={conn.pulse} />
          <span className="font-mono text-[10px] font-medium tracking-wide" style={{ color: conn.color }}>
            {conn.text}
          </span>
        </div>
        <span className="hidden font-mono text-[11px] text-ink-faint md:inline">{formatClock(now)}</span>
        <Link
          to="/"
          className="rounded-sm border border-line px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-faint hover:border-ink-faint hover:text-ink"
        >
          ← OVERVIEW
        </Link>
      </div>
    </header>
  );
}
