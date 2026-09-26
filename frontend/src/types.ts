export type Source = "vision" | "endpoint" | "network";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type SensorStatus = "ok" | "stale" | "never_seen";
export type TransferStatus = 'QUEUED' | 'CONNECTING' | 'TRANSFERRING' | 'COMPLETING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';

export interface Transfer {
  transferId: string;
  fileName: string;
  fileSize: number; // Currently transferred
  sender: string;
  receiver: string;
  status: TransferStatus;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  transferSpeed: number; 
  eta: number; 
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  history: { timestamp: number; bytes: number }[];
}

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
  | "system.reset"
  | "device.connected"
  | "device.updated"
  | "device.disconnected";

export interface WsMessage {
  type: WsMessageType;
  data: unknown;
}

export type ConnState = "connecting" | "live" | "reconnecting" | "disconnected";

// -- Device registry + pairing (wire shapes, snake_case, matches backend) --

export type WireDeviceStatus = "ONLINE" | "DEGRADED" | "OFFLINE" | "UNKNOWN";

export interface WireDevice {
  device_id: string;
  display_name: string;
  device_type: string;
  ip_address: string | null;
  status: WireDeviceStatus;
  first_seen: string;
  last_seen: string;
  paired_at: string | null;
}

export interface PairingCreateResponse {
  token: string;
  expires_at: string;
  ttl_seconds: number;
}

export interface PairingStatusResponse {
  valid: boolean;
  used: boolean;
  expired: boolean;
  expires_at: string;
  session_label: string;
}

export interface PairingConfirmResponse {
  device_id: string;
  device_token: string;
  status: WireDeviceStatus;
  ip_address: string | null;
}

/** The minimal envelope a paired phone receives -- already the shape the
 * backend sends, no snake_case translation needed since it's authored as
 * camelCase on the wire specifically for this one message type. */
export interface WireAlertEnvelope {
  incidentId: string;
  severity: number;
  title: string;
  deviceName: string;
  timestamp: string;
}
