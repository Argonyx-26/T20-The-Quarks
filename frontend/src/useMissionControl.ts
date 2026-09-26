import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { api } from "./api";
import type {
  ConnState,
  HealthResponse,
  Incident,
  SentrixEvent,
  WsMessage,
  Transfer,
} from "./types";

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = import.meta.env.VITE_WS_URL ?? `${protocol}//${window.location.host}/ws`;
const HEALTH_POLL_MS = 5000;
const MAX_EVENTS_KEPT = 300;
const RECONNECT_BASE_MS = 800;
const RECONNECT_MAX_MS = 8000;

export interface MissionControlState {
  events: SentrixEvent[];
  incidents: Incident[];
  health: HealthResponse | null;
  connState: ConnState;
  loading: boolean;
  loadError: string | null;
  justUpdatedIncidentId: string | null;
  reset: () => Promise<void>;
  replay: (scenario: string) => Promise<void>;
  scenarios: string[];
  setIncidentStatus: (incidentId: string, status: string) => Promise<void>;
  reload: () => Promise<void>;
  transfers: Transfer[];
}

function upsertEvent(list: SentrixEvent[], incoming: SentrixEvent): SentrixEvent[] {
  if (list.some((e) => e.event_id === incoming.event_id)) return list;
  const next = [...list, incoming];
  next.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return next.length > MAX_EVENTS_KEPT ? next.slice(next.length - MAX_EVENTS_KEPT) : next;
}

function upsertIncident(list: Incident[], incoming: Incident): Incident[] {
  const idx = list.findIndex((i) => i.incident_id === incoming.incident_id);
  if (idx === -1) return [...list, incoming];
  const next = [...list];
  next[idx] = incoming;
  return next;
}

export function useMissionControl(): MissionControlState {
  const [events, setEvents] = useState<SentrixEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [justUpdatedIncidentId, setJustUpdatedIncidentId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);

  const flashIncident = useCallback((incidentId: string) => {
    setJustUpdatedIncidentId(incidentId);
    setTimeout(() => setJustUpdatedIncidentId((cur) => (cur === incidentId ? null : cur)), 1300);
  }, []);

  const loadInitialState = useCallback(async () => {
    try {
      const [eventsRes, incidentsRes, healthRes] = await Promise.all([
        api.events(300),
        api.incidents(),
        api.health(),
      ]);
      setEvents([...eventsRes.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
      setIncidents(incidentsRes.incidents);
      setHealth(healthRes);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to reach SENTRIX backend");
    } finally {
      setLoading(false);
    }
  }, []);

  const pollHealth = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
    } catch {
      // health poll failures are surfaced via connState from the WS channel instead
    }
  }, []);

  const handleMessage = useCallback(
    (msg: WsMessage) => {
      switch (msg.type) {
        case "event.created":
          setEvents((prev) => upsertEvent(prev, msg.data as SentrixEvent));
          break;
        case "incident.created":
        case "incident.updated": {
          const incident = msg.data as Incident;
          setIncidents((prev) => upsertIncident(prev, incident));
          flashIncident(incident.incident_id);
          break;
        }
        case "sensor.health":
          // Payload shape isn't part of the stable contract yet -- treat the
          // message as a signal to refresh from the REST source of truth
          // rather than assuming its shape.
          pollHealth();
          break;
        case "system.reset":
          setEvents([]);
          setIncidents([]);
          break;
      }
    },
    [flashIncident, pollHealth],
  );

  const connect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    closedByUs.current = false;
    setConnState((cur) => (cur === "live" ? cur : reconnectAttempt.current > 0 ? "reconnecting" : "connecting"));

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setConnState("live");
      // Resync from REST in case we missed events while disconnected.
      loadInitialState();
      pollHealth();
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WsMessage;
        handleMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (closedByUs.current) return;
      setConnState("reconnecting");
      const attempt = reconnectAttempt.current;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      reconnectAttempt.current = attempt + 1;
      reconnectTimer.current = setTimeout(() => {
        setConnState((cur) => (cur === "reconnecting" ? "reconnecting" : cur));
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [handleMessage, loadInitialState, pollHealth]);

  useEffect(() => {
    loadInitialState();
    api.scenarios().then((r) => setScenarios(r.scenarios)).catch(() => setScenarios([]));
    connect();

    const healthInterval = setInterval(pollHealth, HEALTH_POLL_MS);

    return () => {
      closedByUs.current = true;
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      clearInterval(healthInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark disconnected only after a few failed attempts, so a single blip
  // shows "reconnecting" rather than jumping straight to a scary state.
  const effectiveConnState: ConnState =
    connState === "reconnecting" && reconnectAttempt.current > 3 ? "disconnected" : connState;

  const reset = useCallback(async () => {
    await api.reset();
    setEvents([]);
    setIncidents([]);
  }, []);

  const replay = useCallback(async (scenario: string) => {
    await api.replay(scenario, true, 1);
  }, []);

  const setIncidentStatus = useCallback(async (incidentId: string, status: string) => {
    const updated = await api.setIncidentStatus(incidentId, status);
    setIncidents((prev) => upsertIncident(prev, updated));
  }, []);

  const transfers = useMemo(() => {
    const transferMap = new Map<string, Transfer>();
    
    // Sort oldest to newest to replay state
    const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    for (const event of sorted) {
      if (!event.event_type.startsWith("file_transfer")) continue;
      
      const attrs = event.attributes as Record<string, any>;
      const tId = attrs.transfer_id || attrs.filename || 'unknown';
      
      if (!transferMap.has(tId)) {
        transferMap.set(tId, {
          transferId: tId,
          fileName: attrs.filename || 'unknown',
          fileSize: attrs.file_size || 0,
          sender: attrs.device || 'UNKNOWN',
          receiver: event.asset_id,
          status: 'CONNECTING',
          bytesTransferred: attrs.file_size || 0,
          totalBytes: attrs.total_bytes || 1,
          percentage: 0,
          transferSpeed: 0,
          eta: 0,
          startedAt: event.timestamp,
          updatedAt: event.timestamp,
          direction: attrs.transfer_direction || 'INBOUND',
          history: []
        });
      }
      
      const t = transferMap.get(tId)!;
      t.bytesTransferred = attrs.file_size || t.bytesTransferred;
      t.updatedAt = event.timestamp;
      
      const ts = new Date(event.timestamp).getTime();
      t.history.push({ timestamp: ts, bytes: t.bytesTransferred });
      if (t.history.length > 10) t.history.shift();
      
      if (t.history.length > 1) {
        const first = t.history[0];
        const last = t.history[t.history.length - 1];
        const dt = (last.timestamp - first.timestamp) / 1000;
        if (dt > 0) {
          t.transferSpeed = (last.bytes - first.bytes) / dt;
        }
      }
      
      t.percentage = Math.min(100, Math.max(0, (t.bytesTransferred / t.totalBytes) * 100));
      
      if (t.transferSpeed > 0) {
        t.eta = (t.totalBytes - t.bytesTransferred) / t.transferSpeed;
      } else {
        t.eta = 0;
      }
      
      if (event.event_type === "file_transfer_progress") {
        t.status = 'TRANSFERRING';
      } else if (attrs.status === "COMPLETED") {
        t.status = 'COMPLETED';
        t.completedAt = event.timestamp;
        t.percentage = 100;
        t.bytesTransferred = t.totalBytes;
      }
    }
    
    return Array.from(transferMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [events]);

  return {
    events,
    incidents,
    health,
    connState: effectiveConnState,
    loading,
    loadError,
    justUpdatedIncidentId,
    reset,
    replay,
    scenarios,
    setIncidentStatus,
    reload: loadInitialState,
    transfers,
  };
}
