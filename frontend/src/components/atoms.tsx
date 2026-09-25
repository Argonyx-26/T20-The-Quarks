import type { Source } from "../types";
import { sourceColor, sourceLabel } from "../theme";

export function StatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${pulse ? "animate-pulse_dot" : ""}`}
      style={{ backgroundColor: color }}
    />
  );
}

export function SourceTag({ source }: { source: Source }) {
  const color = sourceColor[source];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium tracking-wide"
      style={{ borderColor: `${color}55`, color, backgroundColor: `${color}14` }}
    >
      <StatusDot color={color} />
      {sourceLabel[source]}
    </span>
  );
}

export function SeverityBar({ severity }: { severity: number }) {
  const pct = Math.max(0, Math.min(100, severity));
  const color = pct >= 80 ? "#CB514F" : pct >= 50 ? "#C06A2E" : pct >= 25 ? "#B9842D" : "#4779D8";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-sm bg-base-600">
      <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
