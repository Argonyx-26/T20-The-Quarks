import type {
  Device,
  Incident,
  MissionControlSnapshot,
  NormalizedEvent,
  RealtimeMessage,
  SourceHealth,
} from "../domain";

/**
 * The adapter boundary. Mission Control components never call a backend
 * endpoint directly -- they only ever depend on this interface. Everything
 * on the other side of it (transport, schema mapping, WebSocket vs SSE,
 * REST paths) is free to change without touching a single component.
 *
 * Only methods that make sense are implemented by a given client -- see
 * missionControlApi.ts for what the current backend actually supports.
 * A method that has no backend support yet should reject with a clear
 * "Backend action unavailable" error rather than silently no-op or fake
 * a result.
 */
export interface MissionControlClient {
  getSnapshot(): Promise<MissionControlSnapshot>;
  getDevices(): Promise<Device[]>;
  getEvents(limit?: number): Promise<NormalizedEvent[]>;
  getIncidents(): Promise<Incident[]>;
  getSourceHealth(): Promise<SourceHealth[]>;

  /** Subscribe to realtime updates. Returns an unsubscribe function. */
  subscribe(
    onMessage: (message: RealtimeMessage) => void,
    onStatusChange: (status: MissionControlSnapshot["realtimeStatus"]) => void,
  ): () => void;

  /** Names of controlled scenarios the backend can replay, if any. */
  listScenarios(): Promise<string[]>;
  runScenario(name: string): Promise<void>;
  /** Replays whichever available scenario demonstrates a context mismatch. */
  runMismatchScenario(): Promise<void>;
  resetScenario(): Promise<void>;

  setIncidentStatus(incidentId: string, status: Incident["status"]): Promise<Incident>;
}

export class BackendActionUnavailableError extends Error {
  constructor(action: string) {
    super(`Backend action unavailable: ${action}`);
    this.name = "BackendActionUnavailableError";
  }
}
