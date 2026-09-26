import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { pairingApi } from "../services/missionControlApi";
import type { Device, PairingSession } from "../domain";
import { StatusDot } from "./atoms";

type PanelState = "loading" | "ready" | "expired" | "connected" | "error";

/**
 * The operator-facing QR pairing drawer. Every value shown here comes from
 * a real POST /api/pairing response and the QR encodes the browser's own
 * window.location.origin -- never a guessed/hardcoded LAN IP (a phone
 * scanning it needs to land on whatever address THIS Mission Control tab
 * was itself opened at, which is the one address it's already proven
 * reachable by virtue of being loaded right now).
 */
export function PairingPanel({ devices, onClose }: { devices: Device[]; onClose: () => void }) {
  const [state, setState] = useState<PanelState>("loading");
  const [session, setSession] = useState<PairingSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const knownDeviceIdsRef = useRef<Set<string>>(new Set(devices.map((d) => d.deviceId)));

  const pairUrl = session ? `${window.location.origin}/pair/${session.token}` : null;

  const createSession = useCallback(async () => {
    setState("loading");
    setConnectedDevice(null);
    knownDeviceIdsRef.current = new Set(devices.map((d) => d.deviceId));
    try {
      const s = await pairingApi.create();
      const url = `${window.location.origin}/pair/${s.token}`;
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#121718", light: "#FFFFFF" } });
      setSession(s);
      setQrDataUrl(dataUrl);
      setState("ready");
    } catch {
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    createSession();
  }, [createSession]);

  useEffect(() => {
    if (state !== "ready" || !session) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) setState("expired");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state, session]);

  // A real device.connected broadcast lands in `devices` via the shared
  // context -- detect it by diffing against the set captured when this
  // session was created. No timer pretends this; it only fires off a real
  // prop change driven by the backend.
  useEffect(() => {
    if (state !== "ready") return;
    const fresh = devices.find((d) => !knownDeviceIdsRef.current.has(d.deviceId));
    if (fresh) setConnectedDevice(fresh);
  }, [devices, state]);

  useEffect(() => {
    if (!connectedDevice) return;
    const id = setTimeout(onClose, 2200);
    return () => clearTimeout(id);
  }, [connectedDevice, onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/25" onClick={onClose}>
      <div className="w-full max-w-sm border border-line bg-base-700 p-5 shadow-[0_20px_60px_rgba(20,30,40,0.18)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-[11px] font-bold tracking-widest text-ink-faint">PAIR NEW DEVICE</h3>
          <button onClick={onClose} className="text-[14px] text-ink-faint hover:text-ink">
            ×
          </button>
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <StatusDot color="#8A9596" pulse />
            <p className="text-[12px] text-ink-faint">Requesting pairing code from SENTRIX…</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <StatusDot color="#CB514F" />
            <p className="text-[12.5px] text-ink">Could not reach SENTRIX to create a pairing session.</p>
            <button onClick={createSession} className="rounded-sm border border-line px-3 py-1.5 text-[11.5px] text-ink-muted hover:border-ink-faint hover:text-ink">
              Try again
            </button>
          </div>
        )}

        {state === "expired" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <StatusDot color="#CB514F" />
            <p className="text-[12.5px] text-ink">This pairing code expired.</p>
            <button onClick={createSession} className="rounded-sm border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-muted hover:border-ink-faint hover:text-ink">
              Generate new code
            </button>
          </div>
        )}

        {connectedDevice && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <StatusDot color="#168B84" />
            <p className="text-[15px] font-semibold text-ink">{connectedDevice.displayName} connected</p>
            <p className="font-mono text-[10.5px] tracking-wide text-status-ok">● ONLINE</p>
          </div>
        )}

        {state === "ready" && !connectedDevice && qrDataUrl && (
          <div className="flex flex-col items-center gap-4">
            <img src={qrDataUrl} alt="Pairing QR code" className="h-[220px] w-[220px] border border-line-soft" />
            <p className="text-center text-[11.5px] text-ink-faint">Scan from a device on the same network.</p>
            {secondsLeft !== null && (
              <span className="font-mono text-[10.5px] tracking-wide text-ink-faint">
                EXPIRES IN {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <StatusDot color="#B9842D" pulse />
              <span className="font-mono text-[10.5px] font-medium tracking-wide text-amber">WAITING FOR DEVICE</span>
            </div>
            {pairUrl && (
              <div className="w-full border-t border-line-soft pt-3 text-center">
                <p className="text-[10.5px] text-ink-faint">Can't scan? Open this link on the phone:</p>
                <p className="mt-1 break-all font-mono text-[10.5px] text-ink-muted">{pairUrl}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
