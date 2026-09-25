import type { SensorStatus, Source } from "./types";

export const sourceLabel: Record<Source, string> = {
  vision: "Vision",
  endpoint: "Endpoint",
  network: "Network",
};

export const sourceColor: Record<Source, string> = {
  vision: "#4478B8",
  endpoint: "#7158A6",
  network: "#1E8580",
};

export const sensorStatusLabel: Record<SensorStatus, string> = {
  ok: "Healthy",
  stale: "Degraded",
  never_seen: "Offline",
};

export const sensorStatusColor: Record<SensorStatus, string> = {
  ok: "#39836A",
  stale: "#B68132",
  never_seen: "#6B7677",
};
