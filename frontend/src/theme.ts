import type { DeviceStatus, FusionCriterionStatus, IncidentStatus, Source, SourceHealthStatus } from "./domain";

export const sourceLabel: Record<Source, string> = {
  vision: "Vision",
  endpoint: "Endpoint",
  network: "Network",
};

// VISION blue, ENDPOINT violet, NETWORK teal -- per the Mission Control art direction.
export const sourceColor: Record<Source, string> = {
  vision: "#4779BD",
  endpoint: "#765BAA",
  network: "#168B84",
};

export const sourceHealthLabel: Record<SourceHealthStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  unknown: "Unknown",
};

export const sourceHealthColor: Record<SourceHealthStatus, string> = {
  online: "#3C8B72",
  degraded: "#B9842D",
  offline: "#8A9596",
  unknown: "#8A9596",
};

export const deviceStatusLabel: Record<DeviceStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  unknown: "Unknown",
};

export const deviceStatusColor: Record<DeviceStatus, string> = {
  online: "#168B84",
  degraded: "#B9842D",
  offline: "#8A9596",
  unknown: "#8A9596",
};

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  open: "OPEN",
  acknowledged: "ACKNOWLEDGED",
  resolved: "RESOLVED",
  unknown: "UNKNOWN",
};

export const incidentStatusColor: Record<IncidentStatus, string> = {
  open: "#C75D56",
  acknowledged: "#B9842D",
  resolved: "#3D9270",
  unknown: "#8A9596",
};

// Coral is reserved for incident-level output only -- match/unknown never
// use it, so a glance at color alone can't be confused with an incident.
export const criterionColor: Record<FusionCriterionStatus, string> = {
  match: "#168B84",
  mismatch: "#B9842D",
  unknown: "#8A9596",
};

export const criterionLabel: Record<FusionCriterionStatus, string> = {
  match: "MATCH",
  mismatch: "MISMATCH",
  unknown: "UNKNOWN",
};
