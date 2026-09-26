/**
 * Frontend domain contract for Mission Control.
 *
 * These types are the ONLY shapes UI components are allowed to depend on.
 * Nothing in src/components or src/pages may import backend wire types
 * (src/types.ts) directly -- that translation happens exclusively in
 * src/services/missionControlApi.ts. When the backend contract changes,
 * only that adapter (and, if a field is genuinely new, this file) should
 * need to change.
 *
 * Fields are optional wherever the backend contract for that field is not
 * confirmed. Optional means exactly that: the value may be genuinely
 * absent, and UI must render an explicit "unavailable"/"unknown" state
 * rather than inventing one.
 */

export type Source = "vision" | "endpoint" | "network";

export type DeviceStatus = "online" | "degraded" | "offline" | "unknown";

export interface Device {
  deviceId: string;
  displayName: string;
  deviceType?: string;
  ipAddress?: string;
  zoneId?: string;
  status: DeviceStatus;
  firstSeen?: string;
  lastSeen?: string;
  /** Present only for devices that went through real QR pairing -- absent
   * for anything projected from event history (there is no such
   * projection into this list anymore; kept optional for that reason). */
  pairedAt?: string;
}

export interface NormalizedEvent {
  eventId: string;
  timestamp: string;
  source: Source;
  eventType: string;
  deviceId?: string;
  assetId?: string;
  deviceName?: string;
  ipAddress?: string;
  zoneId?: string;
  severity?: number;
  confidence?: number;
  attributes?: Record<string, unknown>;
  evidence?: unknown;
}

export type SourceHealthStatus = "online" | "degraded" | "offline" | "unknown";

export interface SourceHealth {
  source: Source;
  status: SourceHealthStatus;
  lastSeen?: string;
  message?: string;
}

export type FusionCriterionStatus = "match" | "mismatch" | "unknown";

export interface FusionCriterion {
  key: string;
  label: string;
  status: FusionCriterionStatus;
  value?: string | number;
  detail?: string;
}

export type IncidentStatus = "open" | "acknowledged" | "resolved" | "unknown";

export interface Incident {
  incidentId: string;
  createdAt: string;
  updatedAt?: string;
  status: IncidentStatus;
  summary: string;
  severity?: number;
  confidence?: number;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  zoneId?: string;
  signalIds: string[];
  timeline: NormalizedEvent[];
  reasoning: FusionCriterion[];
  evidence?: unknown[];
  recommendedAction?: string;
}

/**
 * A single discrete network-level observation (e.g. a signal traveling
 * between a device and a zone/peer). This is a discrete-event primitive,
 * NOT a traffic timeseries -- the backend does not provide raw traffic
 * volume, so the topology visualizes discrete observations only.
 */
export interface NetworkObservation {
  id: string;
  timestamp: string;
  deviceId?: string;
  zoneId?: string;
  source: Source;
  kind: string;
}

/**
 * The outcome of the backend evaluating a set of signals for correlation,
 * independent of whether it produced an Incident. Lets the UI show
 * criteria-by-criteria reasoning for a MISMATCH (no incident created) the
 * same way it shows reasoning for a created incident, without the
 * frontend ever deciding match/mismatch itself -- the backend (or a
 * fixture standing in for it) always supplies `outcome` and `criteria`
 * pre-decided.
 */
export interface FusionEvaluation {
  evaluatedAt: string;
  outcome: "incident" | "no_incident";
  criteria: FusionCriterion[];
  deviceId?: string;
  deviceName?: string;
  signalIds?: string[];
  incidentId?: string;
}

export type TransferStatus =
  | "QUEUED"
  | "CONNECTING"
  | "TRANSFERRING"
  | "COMPLETING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PAUSED";

/**
 * Derived, not backend-authored: projected client-side from real
 * `file_transfer_*` events (see services/missionControlApi.ts
 * `deriveTransfers`) the same way Device[] is projected from events.
 * Every field here traces back to a real event's `attributes` -- nothing
 * is fabricated, but percentage/speed/eta are computed presentation state,
 * not backend truth, so treat them as approximate.
 */
export interface Transfer {
  transferId: string;
  fileName: string;
  fileSize: number;
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
  direction: "INBOUND" | "OUTBOUND";
  history: { timestamp: number; bytes: number }[];
}

export type RealtimeStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface MissionControlSnapshot {
  devices: Device[];
  events: NormalizedEvent[];
  incidents: Incident[];
  sourceHealth: SourceHealth[];
  realtimeStatus: RealtimeStatus;
  /** Most recent correlation evaluation, whether or not it created an
   * incident. Optional -- the current backend does not expose this. */
  lastEvaluation?: FusionEvaluation;
}

export type RealtimeMessage =
  | { type: "event"; data: NormalizedEvent }
  | { type: "incident"; data: Incident }
  | { type: "sourceHealth"; data: SourceHealth[] }
  | { type: "deviceConnected"; data: Device }
  | { type: "deviceUpdated"; data: Device }
  | { type: "deviceDisconnected"; data: Device }
  | { type: "reset" };

// -- Device pairing -----------------------------------------------------

export interface PairingSession {
  token: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface PairingStatus {
  valid: boolean;
  used: boolean;
  expired: boolean;
  expiresAt: string;
  sessionLabel: string;
}

export interface PairingConfirmResult {
  deviceId: string;
  deviceToken: string;
  status: DeviceStatus;
  ipAddress?: string;
}

/** The minimal envelope a paired phone ever receives for a qualifying
 * incident -- see services/missionControlApi.ts subscribePairedDevice.
 * No evidence, no timeline, no raw attributes -- ever. */
export interface AlertEnvelope {
  incidentId: string;
  severity: number;
  title: string;
  deviceName: string;
  timestamp: string;
}
