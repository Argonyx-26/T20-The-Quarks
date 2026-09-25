import type { SensorStatus, Source } from "./types";

export const sourceLabel: Record<Source, string> = {
  vision: "Vision",
  endpoint: "Endpoint",
  network: "Network",
};

export const sourceColor: Record<Source, string> = {
  vision: "#4779D8",
  endpoint: "#805EC7",
  network: "#2A9698",
};

export const sensorStatusLabel: Record<SensorStatus, string> = {
  ok: "Healthy",
  stale: "Degraded",
  never_seen: "Offline",
};

export const sensorStatusColor: Record<SensorStatus, string> = {
  ok: "#3D9270",
  stale: "#B9842D",
  never_seen: "#A1A8AF",
};
