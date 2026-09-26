import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Incident, IncidentStatus, MissionControlSnapshot, NormalizedEvent, RealtimeStatus } from "../domain";
import { deriveDevices, missionControlApi } from "../services/missionControlApi";
import { BackendActionUnavailableError } from "../services/missionControlClient";
import { PREVIEW_KEYS, type PreviewKey } from "../fixtures/previewKeys";

const MAX_EVENTS_KEPT = 300;

/** Dev-only: `?preview=<key>` selects a fixture state instead of talking to
 * the real backend. Reading `import.meta.env.DEV` here means Vite's
 * production build statically eliminates this branch -- it cannot ship. */
function readPreviewKey(): PreviewKey | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("preview");
  return raw && (PREVIEW_KEYS as readonly string[]).includes(raw) ? (raw as PreviewKey) : null;
}

function upsertBy<T>(list: T[], incoming: T, keyOf: (item: T) => string): T[] {
  const key = keyOf(incoming);
  const idx = list.findIndex((item) => keyOf(item) === key);
  if (idx === -1) return [...list, incoming];
  const next = [...list];
  next[idx] = incoming;
  return next;
}

export type LifecycleStatus = "booting" | "ready" | "error";

export interface MissionControlData {
  status: LifecycleStatus;
  snapshot: MissionControlSnapshot | null;
  error: string | null;
  justUpdatedIncidentId: string | null;
  scenarios: string[];
  previewKey: PreviewKey | null;
  actionError: string | null;
  reload: () => Promise<void>;
  runScenario: (name: string) => Promise<void>;
  runMismatchScenario: () => Promise<void>;
  resetScenario: () => Promise<void>;
  setIncidentStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
}

export function useMissionControlData(): MissionControlData {
  const previewKey = useMemo(readPreviewKey, []);

  const [status, setStatus] = useState<LifecycleStatus>("booting");
  const [snapshot, setSnapshot] = useState<MissionControlSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [justUpdatedIncidentId, setJustUpdatedIncidentId] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const flashIncident = useCallback((incidentId: string) => {
    setJustUpdatedIncidentId(incidentId);
    setTimeout(() => setJustUpdatedIncidentId((cur) => (cur === incidentId ? null : cur)), 1300);
  }, []);

  const loadLive = useCallback(async () => {
    setStatus((s) => (s === "ready" ? s : "booting"));
    try {
      const initial = await missionControlApi.getSnapshot();
      setSnapshot(initial);
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the SENTRIX backend");
      setStatus("error");
      return;
    }

    missionControlApi.listScenarios().then(setScenarios).catch(() => setScenarios([]));

    unsubscribeRef.current?.();
    unsubscribeRef.current = missionControlApi.subscribe(
      (message) => {
        switch (message.type) {
          case "event": {
            setSnapshot((prev) => {
              if (!prev) return prev;
              let events = upsertBy(prev.events, message.data, (e: NormalizedEvent) => e.eventId);
              events = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
              if (events.length > MAX_EVENTS_KEPT) events = events.slice(events.length - MAX_EVENTS_KEPT);
              return { ...prev, events, devices: deriveDevices(events, Date.now()) };
            });
            break;
          }
          case "incident": {
            setSnapshot((prev) => {
              if (!prev) return prev;
              return { ...prev, incidents: upsertBy(prev.incidents, message.data, (i: Incident) => i.incidentId) };
            });
            flashIncident(message.data.incidentId);
            break;
          }
          case "sourceHealth": {
            setSnapshot((prev) => (prev ? { ...prev, sourceHealth: message.data } : prev));
            break;
          }
          case "reset": {
            setSnapshot((prev) => (prev ? { ...prev, events: [], incidents: [], devices: [] } : prev));
            break;
          }
        }
      },
      (realtimeStatus: RealtimeStatus) => {
        setSnapshot((prev) => (prev ? { ...prev, realtimeStatus } : prev));
      },
    );
  }, [flashIncident]);

  useEffect(() => {
    if (previewKey) {
      if (previewKey === "booting") {
        setStatus("booting");
        return;
      }
      if (previewKey === "error") {
        setStatus("error");
        setError("Simulated backend failure (dev preview)");
        return;
      }
      // Dynamic import gated on the SAME literal `import.meta.env.DEV` check
      // used elsewhere: Vite/esbuild fold this whole block away in a
      // production build, so the fixture payload (device names, sample
      // events, incidents) is excluded from the bundle entirely -- not
      // just unreached at runtime, but physically absent.
      if (import.meta.env.DEV) {
        import("../fixtures/missionControl").then((mod) => {
          setSnapshot(mod.missionControlFixtures[previewKey]);
          setStatus("ready");
          setScenarios([]);
        });
      }
      return;
    }

    loadLive();
    return () => unsubscribeRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  const reload = useCallback(async () => {
    if (previewKey) return;
    await loadLive();
  }, [loadLive, previewKey]);

  const guardLiveAction = useCallback(
    async (action: () => Promise<void>) => {
      if (previewKey) {
        setActionError("Backend action unavailable in preview mode");
        return;
      }
      try {
        setActionError(null);
        await action();
      } catch (err) {
        if (err instanceof BackendActionUnavailableError) {
          setActionError(err.message);
        } else {
          setActionError(err instanceof Error ? err.message : "Action failed");
        }
      }
    },
    [previewKey],
  );

  const runScenario = useCallback((name: string) => guardLiveAction(() => missionControlApi.runScenario(name)), [guardLiveAction]);
  const runMismatchScenario = useCallback(() => guardLiveAction(() => missionControlApi.runMismatchScenario()), [guardLiveAction]);
  const resetScenario = useCallback(
    () =>
      guardLiveAction(async () => {
        await missionControlApi.resetScenario();
        setSnapshot((prev) => (prev ? { ...prev, events: [], incidents: [], devices: [] } : prev));
      }),
    [guardLiveAction],
  );

  const setIncidentStatus = useCallback(
    (incidentId: string, incidentStatus: IncidentStatus) =>
      guardLiveAction(async () => {
        const updated = await missionControlApi.setIncidentStatus(incidentId, incidentStatus);
        setSnapshot((prev) => (prev ? { ...prev, incidents: upsertBy(prev.incidents, updated, (i) => i.incidentId) } : prev));
      }),
    [guardLiveAction],
  );

  return {
    status,
    snapshot,
    error,
    justUpdatedIncidentId,
    scenarios,
    previewKey,
    actionError,
    reload,
    runScenario,
    runMismatchScenario,
    resetScenario,
    setIncidentStatus,
  };
}
