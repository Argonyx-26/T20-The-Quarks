import { useState } from "react";
import { useDeviceConnection } from "../hooks/useDeviceConnection";
import { clearPairedDevice, loadPairedDevice, type StoredPairedDevice } from "../lib/pairedDeviceStorage";
import { isAudioUnlocked, playSiren, stopSiren } from "../lib/siren";
import { api } from "../api";
import { StatusDot } from "../components/atoms";
import { formatClock } from "../format";
import type { AlertEnvelope } from "../domain";

interface FileAlertData {
  uploadId: string;
  filename: string;
  bytes: number;
  title: string;
}

interface FileAlertEnvelope {
  type: "file.alert";
  data: FileAlertData;
}

/**
 * The paired phone's live view -- /phone. Reads a REAL stored credential
 * from a prior /pair/:token confirmation; if there isn't one, this device
 * has never paired and says so plainly rather than inventing a device to
 * display (the previous version of this page fell back to a hardcoded
 * "PHN-B" / 10.20.4.31 demo device when nothing was paired yet -- that's
 * exactly the fake-device-identity failure mode the product rules forbid).
 */
export function PhonePaired() {
  const [stored, setStored] = useState<StoredPairedDevice | null>(() => loadPairedDevice());
  const [alert, setAlert] = useState<AlertEnvelope | null>(null);
  const [fileAlert, setFileAlert] = useState<FileAlertData | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAlert = (incoming: AlertEnvelope) => {
    setAlert(incoming);
    setAcknowledged(false);
    if (isAudioUnlocked()) playSiren(2500);
  };

  const handleFileAlert = (incoming: FileAlertEnvelope) => {
    setFileAlert(incoming.data);
    setAcknowledged(false);
    if (isAudioUnlocked()) playSiren(1500); // shorter siren for file alert
  };

  const connection = useDeviceConnection(
    stored
      ? { deviceId: stored.deviceId, deviceToken: stored.deviceToken, onAlert: handleAlert, onFileAlert: handleFileAlert }
      : { deviceId: "", deviceToken: "" },
  );

  if (!stored) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-800 px-6 text-center">
        <span className="font-display text-[15px] font-bold tracking-[0.28em] text-ink">SENTRIX</span>
        <StatusDot color="#8A9596" />
        <h1 className="text-[20px] font-bold text-ink">Pairing required</h1>
        <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
          This device hasn't paired with SENTRIX yet. Scan the QR code from Mission Control's "Pair Device" panel to connect it.
        </p>
      </div>
    );
  }

  const { status, retry } = connection;
  const styles = stateStyles(status.state);
  const isConnected = status.state === "connected";
  const isBusyReconnecting = status.state === "reconnecting" || status.state === "connecting";
  const isDisconnected = status.state === "disconnected";
  const isPairingExpired = status.state === "pairing_expired";

  const handleUnpair = () => {
    connection.disconnect();
    clearPairedDevice();
    setStored(null);
  };

  const handleAcknowledge = async () => {
    if (!alert) return;
    try {
      await api.setIncidentStatus(alert.incidentId, "ACKNOWLEDGED");
      setAcknowledged(true);
    } catch {
      // Leave the alert visible with its existing MUTE option -- an
      // acknowledge failure shouldn't hide the alert itself.
    }
  };

  const handleDismissFileAlert = () => {
    stopSiren();
    setFileAlert(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-base-800" role="status" aria-live="polite" aria-label={`Connection state: ${status.state}`}>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-4">
        <span className="font-display text-[15px] font-bold tracking-[0.28em] text-ink">SENTRIX</span>
        <div className="flex items-center gap-2">
          <StatusDot color={styles.dotColor} pulse={styles.dotPulse} />
          <span className="font-mono text-[10px] font-medium tracking-wide" style={{ color: styles.dotColor }}>
            {styles.stateLabel}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <ConnectionLineVisual isConnected={isConnected} isReconnecting={isBusyReconnecting} isDisconnected={isDisconnected || isPairingExpired} />

          <div className="text-center">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">
              {isConnected ? "LIVE WITH SENTRIX" : styles.stateLabel}
            </h1>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-muted">{styles.stateSubtext}</p>
          </div>

          <DeviceInfoCard device={stored} isConnected={isConnected} status={status.state} />

          <div className="flex w-full max-w-md flex-col gap-3">
            {isDisconnected && (
              <button
                onClick={retry}
                className="rounded-[8px] bg-teal px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-teal-dark"
              >
                RETRY CONNECTION
              </button>
            )}
            {isPairingExpired && (
              <button
                onClick={handleUnpair}
                className="rounded-[8px] border border-teal/50 px-5 py-3 text-[14px] font-semibold text-teal-dark transition-colors hover:border-teal hover:bg-teal-ultrapale"
              >
                PAIR AGAIN
              </button>
            )}
            {isConnected && (
              <button
                onClick={handleUnpair}
                className="rounded-[8px] border border-line px-5 py-3 text-[14px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
              >
                DISCONNECT
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-white px-4 py-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint">
          <span>SENTRIX Mobile</span>
          <span>{formatClock(new Date().toISOString())}</span>
        </div>
      </footer>

      {alert && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-status-critical px-6 text-center text-white">
          <div className="text-8xl">⚠️</div>
          <h1 className="font-mono text-[13px] font-bold uppercase tracking-[0.3em]">SENTRIX ALERT</h1>
          <p className="font-mono text-[20px] font-bold">{alert.incidentId}</p>
          <p className="max-w-sm text-[16px] font-semibold leading-snug">{alert.title}</p>
          <p className="font-mono text-[13px]">
            Severity {alert.severity} · {formatClock(alert.timestamp)}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => {
                stopSiren();
                setAlert(null);
              }}
              className="rounded-[8px] border-2 border-white/60 px-6 py-3 font-mono text-[13px] font-bold tracking-wide"
            >
              MUTE
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={acknowledged}
              className="rounded-[8px] bg-black/30 px-6 py-3 font-mono text-[13px] font-bold tracking-wide disabled:opacity-60"
            >
              {acknowledged ? "ACKNOWLEDGED" : "ACKNOWLEDGE"}
            </button>
          </div>
        </div>
      )}

      {fileAlert && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-amber px-6 text-center text-white">
          <div className="text-6xl">📁</div>
          <h1 className="font-mono text-[13px] font-bold uppercase tracking-[0.3em]">FILE ACTIVITY ALERT</h1>
          <p className="font-mono text-[18px] font-bold">{fileAlert.filename}</p>
          <p className="max-w-sm text-[16px] font-semibold leading-snug">{fileAlert.title}</p>
          <p className="font-mono text-[13px]">
            {fileAlert.bytes} bytes · upload {fileAlert.uploadId.slice(0, 8)}
          </p>
          <div className="mt-2">
            <button
              onClick={handleDismissFileAlert}
              className="rounded-[8px] border-2 border-white/60 px-6 py-3 font-mono text-[13px] font-bold tracking-wide"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function stateStyles(state: ReturnType<typeof useDeviceConnection>["status"]["state"]) {
  switch (state) {
    case "connected":
      return { dotColor: "#168B84", dotPulse: false, stateLabel: "CONNECTED", stateSubtext: "Live alerts enabled." };
    case "reconnecting":
      return { dotColor: "#B9842D", dotPulse: true, stateLabel: "RECONNECTING", stateSubtext: "Restoring connection…" };
    case "connecting":
      return { dotColor: "#B9842D", dotPulse: true, stateLabel: "CONNECTING", stateSubtext: "Establishing connection…" };
    case "pairing_expired":
      return { dotColor: "#CB514F", dotPulse: false, stateLabel: "PAIRING REQUIRED", stateSubtext: "This device is no longer authorized. Pair again from Mission Control." };
    case "disconnected":
      return { dotColor: "#CB514F", dotPulse: false, stateLabel: "DISCONNECTED", stateSubtext: "Connection to SENTRIX has been lost." };
    default:
      return { dotColor: "#8A9596", dotPulse: false, stateLabel: "ERROR", stateSubtext: "Unable to determine connection state." };
  }
}

function ConnectionLineVisual({ isConnected, isReconnecting, isDisconnected }: { isConnected: boolean; isReconnecting: boolean; isDisconnected: boolean }) {
  return (
    <svg className="h-12 w-full max-w-md" viewBox="0 0 320 48" aria-hidden="true" style={{ opacity: isReconnecting ? 0.7 : 1 }}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#168B84" stopOpacity={isConnected ? 1 : 0.3} />
          <stop offset="50%" stopColor="#168B84" stopOpacity={isDisconnected ? 0 : isReconnecting ? 0.5 : 1} />
          <stop offset="100%" stopColor="#168B84" stopOpacity={isConnected ? 1 : 0.3} />
        </linearGradient>
      </defs>
      <g transform="translate(20, 4)">
        <rect x="0" y="0" width="36" height="40" rx="6" fill="#E8ECEC" stroke="#C0C8C8" strokeWidth="1.5" />
        <rect x="12" y="4" width="12" height="4" rx="2" fill="#8A9596" />
        <rect x="6" y="12" width="24" height="20" rx="2" fill="#121718" />
        {isConnected && (
          <g fill="#168B84">
            <circle cx="18" cy="18" r="2" />
            <circle cx="18" cy="26" r="2" />
            <circle cx="18" cy="34" r="2" />
          </g>
        )}
      </g>
      <path
        d="M56 24 H264"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        strokeDasharray={isDisconnected ? "20 15" : isReconnecting ? "15 10" : undefined}
        strokeLinecap="round"
      />
      {isDisconnected && (
        <g transform="translate(160, 24)">
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="#CB514F" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-8" y1="8" x2="8" y2="-8" stroke="#CB514F" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      <g transform="translate(264, 4)">
        <rect x="0" y="0" width="36" height="40" rx="6" fill="#E8ECEC" stroke="#C0C8C8" strokeWidth="1.5" />
        <text x="18" y="28" textAnchor="middle" fontFamily="IBM Plex Sans, system-ui" fontSize="10" fontWeight="bold" fill="#121718">
          SX
        </text>
      </g>
    </svg>
  );
}

function DeviceInfoCard({
  device,
  isConnected,
  status,
}: {
  device: StoredPairedDevice;
  isConnected: boolean;
  status: string;
}) {
  return (
    <div className="w-full max-w-md rounded-sm border bg-white p-4 shadow-sm" style={{ borderColor: isConnected ? "#168B8433" : "#E0E6E6" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-ink-faint">DEVICE</span>
        <StatusDot color={isConnected ? "#168B84" : "#8A9596"} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-[12px]">
        <dt className="text-ink-faint">Name</dt>
        <dd className="text-right font-mono text-ink">{device.displayName}</dd>
        <dt className="text-ink-faint">Device ID</dt>
        <dd className="max-w-[160px] truncate text-right font-mono text-ink">{device.deviceId}</dd>
        <dt className="text-ink-faint">Network</dt>
        <dd className="text-right font-mono text-ink">{device.ipAddress ?? "IP unavailable"}</dd>
        <dt className="text-ink-faint">Paired</dt>
        <dd className="text-right font-mono text-ink">{new Date(device.pairedAt).toLocaleTimeString()}</dd>
        <dt className="text-ink-faint">Alerts</dt>
        <dd className="text-right font-mono text-ink">{status === "connected" ? "Enabled" : "Paused"}</dd>
      </dl>
    </div>
  );
}
