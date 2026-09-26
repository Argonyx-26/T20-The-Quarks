export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString(undefined, { hour12: false });
}

export function formatRelative(iso: string | null, nowMs: number): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const deltaS = Math.max(0, Math.round((nowMs - then) / 1000));
  if (deltaS < 1) return "just now";
  if (deltaS < 60) return `${deltaS}s ago`;
  const m = Math.floor(deltaS / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function severityBand(sev: number): "low" | "medium" | "high" | "critical" {
  if (sev >= 80) return "critical";
  if (sev >= 50) return "high";
  if (sev >= 25) return "medium";
  return "low";
}

export const severityBandLabel: Record<ReturnType<typeof severityBand>, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const severityBandColor: Record<ReturnType<typeof severityBand>, string> = {
  low: "#4779D8",
  medium: "#B9842D",
  high: "#C06A2E",
  critical: "#CB514F",
};

export function formatConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

export function formatIp(ip: string | undefined): string {
  return ip ?? "IP unavailable";
}

export function humanizeEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}
