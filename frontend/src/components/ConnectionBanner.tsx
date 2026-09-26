import type { RealtimeStatus, SourceHealth } from "../domain";
import { sourceLabel } from "../theme";

export function ConnectionBanner({ realtimeStatus }: { realtimeStatus: RealtimeStatus }) {
  if (realtimeStatus === "connected" || realtimeStatus === "connecting") return null;

  const isReconnecting = realtimeStatus === "reconnecting";
  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-2 border-b px-3 py-1.5 text-[11.5px] font-medium ${
        isReconnecting ? "border-amber/30 bg-amber/10 text-amber" : "border-status-critical/30 bg-status-critical/10 text-status-critical"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isReconnecting ? "animate-pulse_dot" : ""}`} style={{ backgroundColor: "currentColor" }} />
      {isReconnecting
        ? "Reconnecting to SENTRIX backend — last known state is still shown below."
        : "Realtime disconnected. Last known state is shown below and may be stale."}
    </div>
  );
}

export function DegradedSourcesBanner({ sourceHealth }: { sourceHealth: SourceHealth[] }) {
  const degraded = sourceHealth.filter((h) => h.status === "degraded" || h.status === "offline");
  if (degraded.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-amber/30 bg-amber/10 px-3 py-1.5 text-[11.5px] font-medium text-amber">
      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
      {degraded.map((h) => `${sourceLabel[h.source]} ${h.status}`).join(" · ")} — correlation may be less reliable until sources recover.
    </div>
  );
}
