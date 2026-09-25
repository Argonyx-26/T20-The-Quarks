import type { ConnState } from "../types";

export function ConnectionBanner({ connState }: { connState: ConnState }) {
  if (connState === "live" || connState === "connecting") return null;

  const isReconnecting = connState === "reconnecting";
  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-2 border-b px-3 py-1.5 text-[11.5px] font-medium ${
        isReconnecting ? "border-amber/30 bg-amber/10 text-amber" : "border-status-critical/30 bg-status-critical/10 text-status-critical"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isReconnecting ? "animate-pulse_dot" : ""}`} style={{ backgroundColor: "currentColor" }} />
      {isReconnecting
        ? "Reconnecting to SENTRIX backend — last known state is still shown below."
        : "Lost connection to SENTRIX backend. Retrying in the background — state may be stale."}
    </div>
  );
}
