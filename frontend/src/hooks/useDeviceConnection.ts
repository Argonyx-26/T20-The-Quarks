import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api";
import { sendDeviceHeartbeat, subscribePairedDevice } from "../services/missionControlApi";
import type { AlertEnvelope } from "../domain";

/**
 * Real, authenticated connection state for a paired phone -- backed by
 * services/missionControlApi.ts `subscribePairedDevice` (the role-gated
 * WebSocket) and a real heartbeat POST to /api/devices/{id}/heartbeat.
 * The backend decides ONLINE/DEGRADED/OFFLINE; this hook only reports
 * whether the phone's own realtime link and heartbeat are working.
 */
export type PhoneConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected" | "pairing_expired" | "error";

export interface PhoneConnectionStatus {
  state: PhoneConnectionState;
  lastConnectedAt: string | null;
  errorReason: "network_lost" | "backend_down" | "pairing_invalid" | "heartbeat_failed" | null;
}

const HEARTBEAT_INTERVAL_MS = 15_000; // well under backend's DEVICE_DEGRADED_SECONDS=20

interface UseDeviceConnectionOptions {
  deviceId: string;
  deviceToken: string;
  onAlert?: (alert: AlertEnvelope) => void;
}

export function useDeviceConnection({ deviceId, deviceToken, onAlert }: UseDeviceConnectionOptions) {
  const [status, setStatus] = useState<PhoneConnectionStatus>({
    state: "connecting",
    lastConnectedAt: null,
    errorReason: null,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  const patch = useCallback((partial: Partial<PhoneConnectionStatus>) => {
    if (!isMountedRef.current) return;
    setStatus((prev) => ({ ...prev, ...partial }));
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    const beat = async () => {
      try {
        await sendDeviceHeartbeat(deviceId, deviceToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // The backend no longer recognizes this credential (e.g. it
          // restarted and lost its in-memory registry) -- this is not a
          // transient network blip, real re-pairing is required.
          stopHeartbeat();
          patch({ state: "pairing_expired", errorReason: "pairing_invalid" });
        }
        // Other failures are left to the WebSocket's own reconnect logic
        // to surface -- a single missed heartbeat isn't fatal.
      }
    };
    beat();
    heartbeatTimerRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  }, [deviceId, deviceToken, patch, stopHeartbeat]);

  const connect = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribePairedDevice(
      deviceId,
      deviceToken,
      (alert) => onAlertRef.current?.(alert),
      (rtStatus) => {
        switch (rtStatus) {
          case "connected":
            patch({ state: "connected", lastConnectedAt: new Date().toISOString(), errorReason: null });
            startHeartbeat();
            break;
          case "connecting":
            patch({ state: "connecting", errorReason: null });
            break;
          case "reconnecting":
            stopHeartbeat();
            patch({ state: "reconnecting" });
            break;
          case "disconnected":
            stopHeartbeat();
            patch({ state: "disconnected", errorReason: navigator.onLine ? "backend_down" : "network_lost" });
            break;
          case "rejected":
            stopHeartbeat();
            patch({ state: "pairing_expired", errorReason: "pairing_invalid" });
            break;
          case "error":
            stopHeartbeat();
            patch({ state: "disconnected", errorReason: "backend_down" });
            break;
        }
      },
    );
  }, [deviceId, deviceToken, patch, startHeartbeat, stopHeartbeat]);

  const retry = useCallback(() => {
    patch({ state: "connecting", errorReason: null });
    connect();
  }, [connect, patch]);

  const disconnect = useCallback(() => {
    stopHeartbeat();
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, [stopHeartbeat]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, deviceToken]);

  return { status, retry, disconnect };
}
