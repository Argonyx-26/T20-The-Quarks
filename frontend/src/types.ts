export type Source = "vision" | "endpoint" | "network";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type SensorStatus = "ok" | "stale" | "never_seen";

export interface SentrixEvent {
  event_id: string;
  timestamp: string;
  source: Source;
  event_type: string;
  asset_id: string;
  zone_id: string | null;
  severity: number;
  confidence: number;
  attributes: Record<string, unknown>;
  evidence: Record<string, unknown>;
  received_at: string;
  resolved_zone_id: string | null;
}

export interface TimelineEntry {
  timestamp: string;
  label: string;
  event_id: string | null;
}

export interface Incident {
  incident_id: string;
  created_at: string;
  updated_at: string;
  status: IncidentStatus;
  severity: number;
  confidence: number;
  asset_id: string;
  zone_id: string | null;
  summary: string;
  signals: string[];
  timeline: TimelineEntry[];
  reasoning: string[];
  recommended_action: string;
}

export interface SensorHealthEntry {
  status: SensorStatus;
  last_seen: string | null;
  age_seconds?: number;
}

export interface HealthResponse {
  status: string;
  started_at: string;
  server_time: string;
  sensors: Record<Source, SensorHealthEntry>;
  event_count: number;
  incident_count: number;
  open_incident_count: number;
}

export interface ConfigResponse {
  correlation_window_seconds: number;
  minimum_source_diversity: number;
  minimum_confidence: number;
  minimum_combined_severity: number;
  asset_zone_map: Record<string, string>;
  allowed_sources: Source[];
}

export type WsMessageType =
  | "event.created"
  | "incident.created"
  | "incident.updated"
  | "sensor.health"
  | "system.reset";

export interface WsMessage {
  type: WsMessageType;
  data: unknown;
}

export type ConnState = "connecting" | "live" | "reconnecting" | "disconnected";
