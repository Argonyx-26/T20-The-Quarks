/**
 * Real Web Audio siren -- the same oscillator/wail approach that shipped in
 * the original SirenAlert.tsx, kept as a module-level singleton (not
 * component state) so the AudioContext created by a user gesture on
 * /pair/:token survives the client-side navigation to /phone.
 *
 * Browsers only allow creating/resuming an AudioContext inside a real user
 * gesture (a click handler), so `unlockAudio()` must be called synchronously
 * at the top of that handler -- no `await` before it.
 */
let audioCtx: AudioContext | null = null;
let activeOsc: OscillatorNode | null = null;
let wailInterval: ReturnType<typeof setInterval> | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

export function unlockAudio(): void {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  audioCtx?.resume().catch(() => {});
}

export function isAudioUnlocked(): boolean {
  return audioCtx !== null && audioCtx.state === "running";
}

/** Short alert pattern by default (~2.5s), not an infinite siren -- mute
 * (stopSiren) always available, and it auto-stops on its own either way. */
export function playSiren(durationMs = 2500): void {
  if (!audioCtx) return; // never unlocked via a real gesture -- do nothing rather than throw
  stopSiren();
  const ctx = audioCtx;
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.0;
  gainNode.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.connect(gainNode);
  osc.start();
  activeOsc = osc;

  let up = true;
  wailInterval = setInterval(() => {
    osc.frequency.setTargetAtTime(up ? 1200 : 600, ctx.currentTime, 0.3);
    up = !up;
  }, 500);
  autoStopTimer = setTimeout(stopSiren, durationMs);
}

export function stopSiren(): void {
  if (wailInterval) {
    clearInterval(wailInterval);
    wailInterval = null;
  }
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (activeOsc) {
    try {
      activeOsc.stop();
      activeOsc.disconnect();
    } catch {
      // already stopped
    }
    activeOsc = null;
  }
}
