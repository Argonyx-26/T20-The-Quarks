import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MissionControlSnapshot, RealtimeStatus, Source } from "../domain";
import { sourceHealthColor } from "../theme";
import { formatClock } from "../format";
import { StatusDot } from "./atoms";
import type { PreviewKey } from "../fixtures/previewKeys";

interface Props {
  snapshot: MissionControlSnapshot;
  previewKey: PreviewKey | null;
}

const SOURCES: Source[] = ["vision", "endpoint", "network"];

function realtimeLabel(state: RealtimeStatus): { text: string; color: string; pulse: boolean } {
  switch (state) {
    case "connected":
      return { text: "CONNECTED", color: "#3D9270", pulse: false };
    case "connecting":
      return { text: "CONNECTING", color: "#B9842D", pulse: true };
    case "reconnecting":
      return { text: "RECONNECTING", color: "#B9842D", pulse: true };
    case "disconnected":
      return { text: "DISCONNECTED", color: "#CB514F", pulse: false };
    case "error":
      return { text: "ERROR", color: "#CB514F", pulse: false };
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

export function TopCommandRail({ snapshot, previewKey }: Props) {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);

  const rt = realtimeLabel(snapshot.realtimeStatus);
  const healthyCount = SOURCES.filter((s) => snapshot.sourceHealth.find((h) => h.source === s)?.status === "online").length;
  const openIncidents = snapshot.incidents.filter((i) => i.status === "open");
  const maxSeverityOpen = openIncidents.reduce((m, i) => Math.max(m, i.severity ?? 0), 0);
  const incidentColor = openIncidents.length === 0 ? "#121718" : maxSeverityOpen >= 80 ? "#C75D56" : "#B9842D";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-base-700 px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[14px] font-bold tracking-[0.16em] text-ink">SENTRIX</span>
          <span className="text-[11px] text-ink-faint">Mission Control</span>
        </div>
        <span
          className="rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-widest"
          style={
            previewKey
              ? { borderColor: "#4779D855", color: "#4779D8", backgroundColor: "#4779D814" }
              : { borderColor: "#3D927055", color: "#3D9270", backgroundColor: "#3D927014" }
          }
          title={previewKey ? "Rendering a deterministic dev fixture, not live backend data" : undefined}
        >
          {previewKey ? `PREVIEW · ${previewKey.toUpperCase()}` : "LIVE"}
        </span>
      </div>

      <div className="flex h-full items-center divide-x divide-line-soft">
        <Metric value={`${healthyCount}/${SOURCES.length}`} label="SOURCES ONLINE" color={healthyCount === SOURCES.length ? "#3D9270" : "#B9842D"} />
        <Metric value={String(snapshot.devices.length).padStart(2, "0")} label="DEVICES" />
        <Metric value={String(snapshot.events.length).padStart(2, "0")} label="EVENTS" />
        <Metric value={String(openIncidents.length).padStart(2, "0")} label="INCIDENTS" color={incidentColor} />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 sm:flex">
          {SOURCES.map((s) => {
            const st = snapshot.sourceHealth.find((h) => h.source === s)?.status ?? "unknown";
            return <StatusDot key={s} color={sourceHealthColor[st]} pulse={st === "degraded"} />;
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot color={rt.color} pulse={rt.pulse} />
          <span className="font-mono text-[10px] font-medium tracking-wide" style={{ color: rt.color }}>
            {rt.text}
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
