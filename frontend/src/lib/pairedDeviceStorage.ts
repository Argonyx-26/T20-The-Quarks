/**
 * A paired phone's own credential, kept in this browser tab's device only.
 * Never logged, never rendered, never put in a URL. localStorage (not
 * sessionStorage) so a phone that reloads the page stays paired without
 * re-scanning -- it's an opaque per-device bearer token, not a session
 * cookie, so that tradeoff is intentional.
 */
const STORAGE_KEY = "sentrix.pairedDevice.v1";

export interface StoredPairedDevice {
  deviceId: string;
  deviceToken: string;
  displayName: string;
  deviceType: string;
  ipAddress?: string;
  pairedAt: string;
}

export function savePairedDevice(device: StoredPairedDevice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(device));
  } catch {
    // Private browsing / storage disabled -- the phone still works for
    // this page load, it just won't survive a reload. Not fatal.
  }
}

export function loadPairedDevice(): StoredPairedDevice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.deviceId !== "string" || typeof parsed.deviceToken !== "string") return null;
    return parsed as StoredPairedDevice;
  } catch {
    return null;
  }
}

export function clearPairedDevice(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
