import { api } from "../api";
import type {
  ConnState,
  Incident as WireIncident,
  PairingConfirmResponse,
  SensorStatus,
  SentrixEvent,
  Source as WireSource,
  WireAlertEnvelope,
  WireDevice,
  WireDeviceStatus,
  WsMessage,
} from "../types";
import type {
  AlertEnvelope,
  Device,
  DeviceStatus,
  FusionCriterion,
  Incident,
  MissionControlSnapshot,
  NormalizedEvent,
  PairingConfirmResult,
  PairingSession,
  PairingStatus,
  RealtimeMessage,
  RealtimeStatus,
  SourceHealth,
  SourceHealthStatus,
  Transfer,
  TransferStatus,
} from "../domain";
import { BackendActionUnavailableError, type MissionControlClient } from "./missionControlClient";

/**
 * THE integration point. Everything above this line (components, hooks,
 * fixtures) speaks only the domain contract in src/domain/types.ts.
 * Everything below translates that contract onto the SENTRIX backend
 * described in docs/API_CONTRACT.md.
 *
 * When a richer/different backend contract lands (device registry, IP
 * addresses, structured mismatch reasoning, scenario-by-category, ...),
 * this is the only file that should need real rework -- swap the mapping
 * functions and transport, keep the exported shape identical.
 *
 * Known gaps against the domain contract, given the CURRENT backend:
 *  - No device registry or IP/network identity: devices are derived from
 *    observed asset_id on events. ipAddress is always left undefined
 *    (never fabricated) -- see MISSION_CONTROL_CONTRACT.md.
 *  - No structured correlation criteria: incident.reasoning is freeform
 *    text, heuristically labeled into FusionCriterion rows for display.
 *    All rows are "match" because the backend only ever returns reasoning
 *    for incidents it already created.
 *  - No explicit "mismatch" outcome: when signals fail to correlate, the
 *    backend simply never creates an incident. There is no payload to
 *    build a structured CONTEXT MISMATCH view from live traffic today --
 *    that state is demonstrated via fixtures until the backend exposes it.
 */

// Relative by default so phones on the LAN talking to the laptop's own
// address get proxied to the backend the same way `/api` does (see
// vite.config.ts) -- only overridden by VITE_WS_URL for a split-origin setup.
const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = import.meta.env.VITE_WS_URL ?? `${wsProtocol}//${typeof window !== "undefined" ? window.location.host : "localhost:8000"}/ws`;
const RECONNECT_BASE_MS = 800;
const RECONNECT_MAX_MS = 8000;

function toIncidentStatus(status: WireIncident["status"]): Incident["status"] {
  switch (status) {
    case "OPEN":
      return "open";
    case "ACKNOWLEDGED":
      return "acknowledged";
    case "RESOLVED":
      return "resolved";
    default:
      return "unknown";
  }
}

function fromIncidentStatus(status: Incident["status"]): WireIncident["status"] {
  switch (status) {
    case "open":
      return "OPEN";
    case "acknowledged":
      return "ACKNOWLEDGED";
    case "resolved":
      return "RESOLVED";
    default:
      return "OPEN";
  }
}

function toSourceHealthStatus(status: SensorStatus | undefined): SourceHealthStatus {
  switch (status) {
    case "ok":
      return "online";
    case "stale":
      return "degraded";
    case "never_seen":
      return "offline";
    default:
      return "unknown";
  }
}

function toRealtimeStatus(state: ConnState): RealtimeStatus {
  switch (state) {
    case "live":
      return "connected";
    case "connecting":
      return "connecting";
    case "reconnecting":
      return "reconnecting";
    case "disconnected":
      return "disconnected";
    default:
      return "error";
  }
}

function mapEvent(e: SentrixEvent): NormalizedEvent {
  return {
    eventId: e.event_id,
    timestamp: e.timestamp,
    source: e.source,
    eventType: e.event_type,
    deviceId: e.asset_id,
    assetId: e.asset_id,
    deviceName: e.asset_id,
    // The current backend has no network-layer device identity. Never
    // fabricate one -- UI must render "IP unavailable" for this.
    ipAddress: undefined,
    zoneId: e.zone_id ?? e.resolved_zone_id ?? undefined,
    severity: e.severity,
    confidence: e.confidence,
    attributes: e.attributes,
    evidence: e.evidence,
  };
}

/** Heuristic label ONLY -- does not decide match/mismatch, just groups an
 * already-decided, backend-authored reasoning string for display. Every row
 * is "match" because the backend only emits reasoning for incidents it has
 * already created. */
function parseReasoningLine(line: string, idx: number): FusionCriterion {
  let label = "Signal";
  if (/zone/i.test(line)) label = "Zone";
  else if (/asset|device/i.test(line)) label = "Device";
  else if (/time|window|second/i.test(line)) label = "Time";
  else if (/diversity|source/i.test(line)) label = "Source diversity";
  else if (/confidence/i.test(line)) label = "Confidence";
  else if (/severity/i.test(line)) label = "Severity";

  return { key: `reason-${idx}`, label, status: "match", detail: line };
}

function sourceFromLabel(label: string): WireSource | null {
  const s = label.split(":")[0];
  return s === "vision" || s === "endpoint" || s === "network" ? s : null;
}

function mapTimelineEntry(
  entry: WireIncident["timeline"][number],
  wireEventsById: Map<string, SentrixEvent>,
): NormalizedEvent {
  const full = entry.event_id ? wireEventsById.get(entry.event_id) : undefined;
  if (full) return mapEvent(full);

  // No resolvable event record -- fall back to what the timeline label
  // itself encodes ("source:event_type"), per API_CONTRACT.md.
  const source = sourceFromLabel(entry.label);
  const idx = entry.label.indexOf(":");
  const eventType = idx === -1 ? entry.label : entry.label.slice(idx + 1);
  return {
    eventId: entry.event_id ?? `${entry.timestamp}-${entry.label}`,
    timestamp: entry.timestamp,
    source: source ?? "network",
    eventType,
  };
}

function mapIncident(inc: WireIncident, wireEventsById: Map<string, SentrixEvent>): Incident {
  const signalEvidence = inc.signals
    .map((id) => wireEventsById.get(id)?.evidence)
    .filter((e): e is Record<string, unknown> => !!e && Object.keys(e).length > 0);

  return {
    incidentId: inc.incident_id,
    createdAt: inc.created_at,
    updatedAt: inc.updated_at,
    status: toIncidentStatus(inc.status),
    summary: inc.summary,
    severity: inc.severity,
    confidence: inc.confidence,
    deviceId: inc.asset_id,
    deviceName: inc.asset_id,
    ipAddress: undefined,
    zoneId: inc.zone_id ?? undefined,
    signalIds: inc.signals,
    timeline: inc.timeline.map((t) => mapTimelineEntry(t, wireEventsById)),
    reasoning: inc.reasoning.map(parseReasoningLine),
    evidence: signalEvidence.length > 0 ? signalEvidence : undefined,
    recommendedAction: inc.recommended_action,
  };
}

function toDeviceStatus(status: WireDeviceStatus): DeviceStatus {
  switch (status) {
    case "ONLINE":
      return "online";
    case "DEGRADED":
      return "degraded";
    case "OFFLINE":
      return "offline";
    default:
      return "unknown";
  }
}

/** A device exists here ONLY after a real pairing confirmation on the
 * backend -- there is no event-derived projection anymore. IP is
 * whatever the backend actually observed (may be absent); device_id is
 * identity, never IP. */
function mapWireDevice(d: WireDevice): Device {
  return {
    deviceId: d.device_id,
    displayName: d.display_name,
    deviceType: d.device_type,
    ipAddress: d.ip_address ?? undefined,
    status: toDeviceStatus(d.status),
    firstSeen: d.first_seen,
    lastSeen: d.last_seen,
    pairedAt: d.paired_at ?? undefined,
  };
}

function mapAlertEnvelope(a: WireAlertEnvelope): AlertEnvelope {
  return {
    incidentId: a.incidentId,
    severity: a.severity,
    title: a.title,
    deviceName: a.deviceName,
    timestamp: a.timestamp,
  };
}

/**
 * Projects the real `file_transfer_*` events emitted by
 * sensors/mac_endpoint_agent.py into a per-transfer progress view. This is
 * presentation aggregation over already-real, already-ingested events
 * (same category as deriveDevices) -- it does not decide anything the
 * backend hasn't already told us via event attributes.
 */
export function deriveTransfers(events: NormalizedEvent[]): Transfer[] {
  const byId = new Map<string, Transfer>();
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const event of sorted) {
    if (!event.eventType.startsWith("file_transfer")) continue;
    const attrs = (event.attributes ?? {}) as Record<string, unknown>;
    const transferId = String(attrs.transfer_id ?? attrs.filename ?? "unknown");

    let t = byId.get(transferId);
    if (!t) {
      t = {
        transferId,
        fileName: String(attrs.filename ?? "unknown"),
        fileSize: Number(attrs.file_size ?? 0),
        sender: String(attrs.device ?? "UNKNOWN"),
        receiver: event.deviceId ?? event.assetId ?? "UNKNOWN",
        status: "CONNECTING",
        bytesTransferred: Number(attrs.file_size ?? 0),
        totalBytes: Number(attrs.total_bytes ?? 1),
        percentage: 0,
        transferSpeed: 0,
        eta: 0,
        startedAt: event.timestamp,
        updatedAt: event.timestamp,
        direction: (attrs.transfer_direction as Transfer["direction"]) ?? "INBOUND",
        history: [],
      };
      byId.set(transferId, t);
    }

    t.bytesTransferred = Number(attrs.file_size ?? t.bytesTransferred);
    t.updatedAt = event.timestamp;

    const ts = new Date(event.timestamp).getTime();
    t.history.push({ timestamp: ts, bytes: t.bytesTransferred });
    if (t.history.length > 10) t.history.shift();

    if (t.history.length > 1) {
      const first = t.history[0];
      const last = t.history[t.history.length - 1];
      const dt = (last.timestamp - first.timestamp) / 1000;
      t.transferSpeed = dt > 0 ? (last.bytes - first.bytes) / dt : t.transferSpeed;
    }

    t.percentage = Math.min(100, Math.max(0, (t.bytesTransferred / t.totalBytes) * 100));
    t.eta = t.transferSpeed > 0 ? (t.totalBytes - t.bytesTransferred) / t.transferSpeed : 0;

    if (event.eventType === "file_transfer_progress") {
      t.status = "TRANSFERRING";
    } else if (attrs.status === "COMPLETED") {
      t.status = "COMPLETED" as TransferStatus;
      t.completedAt = event.timestamp;
      t.percentage = 100;
      t.bytesTransferred = t.totalBytes;
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

class SentrixMissionControlApi implements MissionControlClient {
  private eventsCache = new Map<string, SentrixEvent>();

  private async getWireEvents(limit = 300): Promise<SentrixEvent[]> {
    const res = await api.events(limit);
    const sorted = [...res.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (const e of sorted) this.eventsCache.set(e.event_id, e);
    return sorted;
  }

  async getEvents(limit = 300): Promise<NormalizedEvent[]> {
    const wire = await this.getWireEvents(limit);
    return wire.map(mapEvent);
  }

  async getDevices(): Promise<Device[]> {
    const res = await api.devices();
    return res.devices.map(mapWireDevice);
  }

  async getIncidents(): Promise<Incident[]> {
    const [wireEvents, res] = await Promise.all([this.getWireEvents(300), api.incidents()]);
    const byId = new Map(wireEvents.map((e) => [e.event_id, e]));
    return res.incidents.map((inc) => mapIncident(inc, byId));
  }

  async getSourceHealth(): Promise<SourceHealth[]> {
    const sources: WireSource[] = ["vision", "endpoint", "network"];
    try {
      const health = await api.health();
      return sources.map((source) => {
        const entry = health.sensors[source];
        return {
          source,
          status: toSourceHealthStatus(entry?.status),
          lastSeen: entry?.last_seen ?? undefined,
        };
      });
    } catch {
      // Health is genuinely unknown, not offline -- don't guess.
      return sources.map((source) => ({ source, status: "unknown" as const }));
    }
  }

  async getSnapshot(): Promise<MissionControlSnapshot> {
    const [devices, events, incidents, sourceHealth] = await Promise.all([
      this.getDevices(),
      this.getEvents(300),
      this.getIncidents(),
      this.getSourceHealth(),
    ]);
    return {
      devices,
      events,
      incidents,
      sourceHealth,
      realtimeStatus: "connecting",
    };
  }

  subscribe(
    onMessage: (message: RealtimeMessage) => void,
    onStatusChange: (status: RealtimeStatus) => void,
  ): () => void {
    let ws: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByUs = false;

    const emitStatus = (state: ConnState) => onStatusChange(toRealtimeStatus(state));

    const connect = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      closedByUs = false;
      emitStatus(reconnectAttempt > 0 ? "reconnecting" : "connecting");

      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttempt = 0;
        emitStatus("live");
      };

      ws.onmessage = (evt) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        switch (msg.type) {
          case "event.created": {
            const wireEvent = msg.data as SentrixEvent;
            this.eventsCache.set(wireEvent.event_id, wireEvent);
            onMessage({ type: "event", data: mapEvent(wireEvent) });
            break;
          }
          case "incident.created":
          case "incident.updated": {
            const wireIncident = msg.data as WireIncident;
            onMessage({ type: "incident", data: mapIncident(wireIncident, this.eventsCache) });
            break;
          }
          case "sensor.health": {
            this.getSourceHealth().then((health) => onMessage({ type: "sourceHealth", data: health }));
            break;
          }
          case "system.reset": {
            this.eventsCache.clear();
            onMessage({ type: "reset" });
            break;
          }
          case "device.connected": {
            onMessage({ type: "deviceConnected", data: mapWireDevice(msg.data as WireDevice) });
            break;
          }
          case "device.updated": {
            onMessage({ type: "deviceUpdated", data: mapWireDevice(msg.data as WireDevice) });
            break;
          }
          case "device.disconnected": {
            onMessage({ type: "deviceDisconnected", data: mapWireDevice(msg.data as WireDevice) });
            break;
          }
        }
      };

      ws.onclose = () => {
        if (closedByUs) return;
        emitStatus("reconnecting");
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
        reconnectAttempt += 1;
        if (reconnectAttempt > 4) emitStatus("disconnected");
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }

  async listScenarios(): Promise<string[]> {
    const res = await api.scenarios();
    return res.scenarios;
  }

  async runScenario(name: string): Promise<void> {
    await api.replay(name, true, 1);
  }

  async runMismatchScenario(): Promise<void> {
    const scenarios = await this.listScenarios();
    const mismatchScenario = scenarios.find((s) => /mismatch/i.test(s));
    if (!mismatchScenario) {
      throw new BackendActionUnavailableError("run mismatch scenario");
    }
    await this.runScenario(mismatchScenario);
  }

  async resetScenario(): Promise<void> {
    await api.reset();
    this.eventsCache.clear();
  }

  async setIncidentStatus(incidentId: string, status: Incident["status"]): Promise<Incident> {
    const updated = await api.setIncidentStatus(incidentId, fromIncidentStatus(status));
    const wireEvents = await this.getWireEvents(300);
    const byId = new Map(wireEvents.map((e) => [e.event_id, e]));
    return mapIncident(updated, byId);
  }
}

export const missionControlApi: MissionControlClient = new SentrixMissionControlApi();

/**
 * The phone's own, separate concern -- not part of MissionControlClient,
 * because a phone never needs (and must never get) the mission-control
 * realtime role. Pure REST, no shared state with the class above.
 */
export const pairingApi = {
  async create(): Promise<PairingSession> {
    const res = await api.createPairing();
    return { token: res.token, expiresAt: res.expires_at, ttlSeconds: res.ttl_seconds };
  },

  async status(token: string): Promise<PairingStatus> {
    const res = await api.getPairingStatus(token);
    return { valid: res.valid, used: res.used, expired: res.expired, expiresAt: res.expires_at, sessionLabel: res.session_label };
  },

  async confirm(token: string, info: { displayName?: string; deviceType?: string }): Promise<PairingConfirmResult> {
    const res: PairingConfirmResponse = await api.confirmPairing(token, {
      display_name: info.displayName,
      device_type: info.deviceType,
    });
    return { deviceId: res.device_id, deviceToken: res.device_token, status: toDeviceStatus(res.status), ipAddress: res.ip_address ?? undefined };
  },
};

export async function sendDeviceHeartbeat(deviceId: string, deviceToken: string): Promise<void> {
  await api.deviceHeartbeat(deviceId, deviceToken);
}

/**
 * A paired phone's OWN realtime connection -- role=paired_device, gated by
 * its device credential at the WebSocket handshake. This is a genuinely
 * different channel from missionControlApi.subscribe(): the server only
 * ever pushes `incident.alert` (minimal envelope) down it, never a full
 * event/incident payload -- see backend/app/ws.py ConnectionManager.
 */
export function subscribePairedDevice(
  deviceId: string,
  deviceToken: string,
  onAlert: (alert: AlertEnvelope) => void,
  onStatusChange: (status: RealtimeStatus | "rejected") => void,
): () => void {
  let ws: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByUs = false;

  const connect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    closedByUs = false;
    onStatusChange(reconnectAttempt > 0 ? "reconnecting" : "connecting");

    const params = new URLSearchParams({ role: "paired_device", device_id: deviceId, token: deviceToken });
    ws = new WebSocket(`${WS_URL}?${params.toString()}`);

    ws.onopen = () => {
      reconnectAttempt = 0;
      onStatusChange("connected");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as { type: string; data: unknown };
        if (msg.type === "incident.alert") {
          onAlert(mapAlertEnvelope(msg.data as WireAlertEnvelope));
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = (evt) => {
      if (closedByUs) return;
      // 4401 is this backend's own close code for "credential rejected at
      // handshake" (see backend/app/main.py) -- reconnecting would never
      // succeed, so surface it distinctly rather than retrying forever.
      if (evt.code === 4401) {
        onStatusChange("rejected");
        return;
      }
      onStatusChange("reconnecting");
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      if (reconnectAttempt > 4) onStatusChange("disconnected");
      reconnectTimer = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  connect();

  return () => {
    closedByUs = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
