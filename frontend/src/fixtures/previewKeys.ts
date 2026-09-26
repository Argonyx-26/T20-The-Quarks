/**
 * Just the list of valid `?preview=` keys -- deliberately separated from
 * missionControl.ts (which holds the actual fixture payloads: device
 * names, event streams, incidents). Keeping this list in its own
 * near-empty module means the code that *validates* a preview key
 * (reachable from production, to know whether to even attempt a dynamic
 * import) never pulls in the fixture data itself.
 */
export const PREVIEW_KEYS = [
  "idle",
  "devices",
  "activity",
  "evaluating",
  "incident",
  "mismatch",
  "degraded",
  "disconnected",
  "zero",
  "connecting",
  "booting",
  "error",
] as const;

export type PreviewKey = (typeof PREVIEW_KEYS)[number];
