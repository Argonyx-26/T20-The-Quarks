import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { pairingApi } from "../services/missionControlApi";
import { savePairedDevice } from "../lib/pairedDeviceStorage";
import { unlockAudio } from "../lib/siren";
import { ApiError } from "../api";
import { StatusDot } from "../components/atoms";

type PageState =
  | "loading"
  | "ready"
  | "confirming"
  | "expired"
  | "used"
  | "invalid"
  | "unreachable"
  | "confirm_failed";

/**
 * The QR scan destination -- /pair/:token. Validates the token for real
 * against GET /api/pairing/{token}, then on a real user tap both unlocks
 * the Web Audio siren (same synchronous gesture, since the browser won't
 * allow it later) and confirms pairing for real against
 * POST /api/pairing/{token}/confirm. No state here is invented locally;
 * every screen reflects an actual backend response.
 */
export default function PairDevice() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>("loading");
  const [sessionLabel, setSessionLabel] = useState("SENTRIX Mission Control");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const checkStatus = useCallback(async () => {
    if (!token) {
      setState("invalid");
      return;
    }
    setState("loading");
    try {
      const status = await pairingApi.status(token);
      setSessionLabel(status.sessionLabel);
      if (status.used) {
        setState("used");
      } else if (status.expired) {
        setState("expired");
      } else if (!status.valid) {
        setState("invalid");
      } else {
        const remaining = Math.max(0, Math.round((new Date(status.expiresAt).getTime() - Date.now()) / 1000));
        setSecondsLeft(remaining);
        setState("ready");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState("invalid");
      } else {
        setState("unreachable");
      }
    }
  }, [token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (state !== "ready" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setState("expired");
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [state, secondsLeft]);

  const handleConnect = () => {
    // CRITICAL: unlockAudio() must be the first thing that happens inside
    // this synchronous click handler -- no await before it, or mobile
    // Safari/Chrome will refuse to let this AudioContext ever play sound.
    unlockAudio();

    if (!token) return;
    setState("confirming");
    pairingApi
      .confirm(token, { displayName: "Phone", deviceType: "mobile" })
      .then((result) => {
        savePairedDevice({
          deviceId: result.deviceId,
          deviceToken: result.deviceToken,
          displayName: "Phone",
          deviceType: "mobile",
          ipAddress: result.ipAddress,
          pairedAt: new Date().toISOString(),
        });
        navigate("/phone", { replace: true });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 409) setState("used");
        else if (err instanceof ApiError && err.status === 410) setState("expired");
        else setState("confirm_failed");
      });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-800 px-6 py-10 text-center">
      <span className="font-display text-[15px] font-bold tracking-[0.28em] text-ink">SENTRIX</span>

      <div className="mt-10 w-full max-w-sm">
        {state === "loading" && (
          <>
            <StatusDot color="#8A9596" pulse />
            <p className="mt-3 text-[13px] text-ink-faint">Checking pairing request…</p>
          </>
        )}

        {state === "ready" && (
          <>
            <h1 className="text-[22px] font-bold text-ink">Pair this device</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              {sessionLabel} is requesting permission to connect this device and send it live security alerts.
            </p>
            <button
              onClick={handleConnect}
              className="mt-8 w-full rounded-[8px] bg-teal px-6 py-4 text-[15px] font-semibold tracking-wide text-white transition-colors hover:bg-teal-dark"
            >
              CONNECT DEVICE
            </button>
            {secondsLeft !== null && (
              <p className="mt-4 font-mono text-[11px] text-ink-faint">
                Expires in {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
              </p>
            )}
          </>
        )}

        {state === "confirming" && (
          <>
            <StatusDot color="#B9842D" pulse />
            <p className="mt-3 text-[13px] text-ink-faint">Connecting to {sessionLabel}…</p>
          </>
        )}

        {state === "expired" && (
          <FailureCard
            title="Pairing expired"
            detail="This QR code is no longer valid. Ask Mission Control to generate a new one and scan again."
          />
        )}

        {state === "used" && (
          <FailureCard
            title="Pairing already used"
            detail="This code has already paired a device. Ask Mission Control to generate a new one."
          />
        )}

        {state === "invalid" && (
          <FailureCard title="Pairing not found" detail="This link doesn't match a real pairing request." />
        )}

        {state === "unreachable" && (
          <FailureCard
            title="Backend unreachable"
            detail="This device can't reach SENTRIX. Confirm you're on the same Wi-Fi network as the laptop and try again."
            onRetry={checkStatus}
          />
        )}

        {state === "confirm_failed" && (
          <FailureCard title="Couldn't connect" detail="Something went wrong confirming this device." onRetry={checkStatus} />
        )}
      </div>
    </div>
  );
}

function FailureCard({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <>
      <StatusDot color="#CB514F" />
      <h1 className="mt-3 text-[20px] font-bold text-ink">{title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{detail}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-sm border border-line px-5 py-2.5 text-[13px] font-medium text-ink-muted hover:border-ink-faint hover:text-ink"
        >
          Try again
        </button>
      )}
    </>
  );
}
