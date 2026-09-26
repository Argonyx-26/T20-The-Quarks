/**
 * Deterministic fixtures for DEVELOPMENT and VISUAL QA only.
 *
 * These are hand-authored, fixed data -- never Math.random(), never a
 * setTimeout loop pretending to be a live backend. They exist so every
 * Mission Control UI state can be built and screenshotted without a
 * running backend. They must never be imported by production data-fetch
 * code (see src/services/missionControlApi.ts) and never used as an
 * automatic fallback when the real backend is unavailable -- that case
 * renders an explicit "BACKEND UNAVAILABLE" state instead (see
 * src/hooks/useMissionControlData.ts).
 *
 * Wired in only behind `?preview=<key>`, itself gated to `import.meta.env.DEV`
 * in src/pages/MissionControl.tsx, so this module cannot affect a
 * production build's runtime behavior.
 */
import type { Device, FusionCriterion, Incident, MissionControlSnapshot, NormalizedEvent, SourceHealth } from "../domain";
import type { PreviewKey } from "./previewKeys";

const NOW = Date.now();
const agoIso = (ms: number) => new Date(NOW - ms).toISOString();
const SEC = 1000;
const MIN = 60 * SEC;

const HEALTHY_SOURCE_HEALTH: SourceHealth[] = [
  { source: "vision", status: "online", lastSeen: agoIso(4 * SEC) },
  { source: "endpoint", status: "online", lastSeen: agoIso(9 * SEC) },
  { source: "network", status: "online", lastSeen: agoIso(2 * SEC) },
];

const UNKNOWN_SOURCE_HEALTH: SourceHealth[] = [
  { source: "vision", status: "unknown" },
  { source: "endpoint", status: "unknown" },
  { source: "network", status: "unknown" },
];

const BASE_DEVICES: Device[] = [
  {
    deviceId: "PHN-A",
    displayName: "Phone A",
    deviceType: "mobile",
    ipAddress: "10.20.4.31",
    zoneId: "LAB-01",
    status: "online",
    firstSeen: agoIso(41 * MIN),
    lastSeen: agoIso(3 * SEC),
  },
  {
    deviceId: "PHN-B",
    displayName: "Phone B",
    deviceType: "mobile",
    // Deliberately no IP on this one -- exercises the "IP unavailable" path.
    ipAddress: undefined,
    zoneId: "LAB-01",
    status: "online",
    firstSeen: agoIso(38 * MIN),
    lastSeen: agoIso(11 * SEC),
  },
  {
    deviceId: "EP-014",
    displayName: "Workstation EP-014",
    deviceType: "endpoint",
    ipAddress: "10.20.4.52",
    zoneId: "LAB-02",
    status: "offline",
    firstSeen: agoIso(3 * 60 * MIN),
    lastSeen: agoIso(14 * MIN),
  },
];

function baseEvents(): NormalizedEvent[] {
  return [
    {
      eventId: "evt-vis-01",
      timestamp: agoIso(9 * MIN),
      source: "vision",
      eventType: "person_in_restricted_zone",
      deviceId: "PHN-A",
      deviceName: "Phone A",
      zoneId: "LAB-01",
      severity: 62,
      confidence: 0.81,
    },
    {
      eventId: "evt-ep-01",
      timestamp: agoIso(7 * MIN),
      source: "endpoint",
      eventType: "unusual_process_start",
      deviceId: "EP-014",
      deviceName: "Workstation EP-014",
      zoneId: "LAB-02",
      severity: 34,
      confidence: 0.64,
    },
    {
      eventId: "evt-net-01",
      timestamp: agoIso(3 * MIN),
      source: "network",
      eventType: "badge_scan",
      deviceId: "PHN-B",
      deviceName: "Phone B",
      zoneId: "LAB-01",
      severity: 18,
      confidence: 0.9,
    },
  ];
}

function withRecentActivity(): NormalizedEvent[] {
  return [
    ...baseEvents(),
    {
      eventId: "evt-vis-02",
      timestamp: agoIso(35 * SEC),
      source: "vision",
      eventType: "motion_detected",
      deviceId: "PHN-A",
      deviceName: "Phone A",
      zoneId: "LAB-01",
      severity: 28,
      confidence: 0.71,
    },
    {
      eventId: "evt-net-02",
      timestamp: agoIso(12 * SEC),
      source: "network",
      eventType: "device_associated",
      deviceId: "PHN-B",
      deviceName: "Phone B",
      zoneId: "LAB-01",
      severity: 12,
      confidence: 0.93,
    },
  ];
}

const INCIDENT_TIMELINE: NormalizedEvent[] = [
  {
    eventId: "evt-vis-inc-01",
    timestamp: agoIso(96 * SEC),
    source: "vision",
    eventType: "person_in_restricted_zone",
    deviceId: "PHN-B",
    deviceName: "Phone B",
    zoneId: "LAB-01",
    severity: 74,
    confidence: 0.86,
  },
  {
    eventId: "evt-ep-inc-01",
    timestamp: agoIso(90 * SEC),
    source: "endpoint",
    eventType: "credential_reuse_detected",
    deviceId: "PHN-B",
    deviceName: "Phone B",
    zoneId: "LAB-01",
    severity: 81,
    confidence: 0.79,
  },
  {
    eventId: "evt-net-inc-01",
    timestamp: agoIso(82 * SEC),
    source: "network",
    eventType: "unrecognized_device_join",
    deviceId: "PHN-B",
    deviceName: "Phone B",
    zoneId: "LAB-01",
    severity: 69,
    confidence: 0.88,
  },
];

const MATCH_CRITERIA: FusionCriterion[] = [
  { key: "time", label: "Time", status: "match", value: "8.2 sec", detail: "All three signals fell inside the 30s correlation window." },
  { key: "device", label: "Device", status: "match", value: "Phone B", detail: "Every signal resolved to the same device identity." },
  { key: "network", label: "Network", status: "match", value: "LAB-01", detail: "Same zone reported directly and via the asset map." },
  { key: "diversity", label: "Source diversity", status: "match", value: 3, detail: "Vision, endpoint and network all corroborated." },
];

const MISMATCH_CRITERIA: FusionCriterion[] = [
  { key: "time", label: "Time", status: "match", value: "6.4 sec", detail: "Signals arrived close together in time." },
  { key: "device", label: "Device", status: "mismatch", value: "EP-014 vs Phone B", detail: "Endpoint signal named a different device than vision/network." },
  { key: "network", label: "Network", status: "mismatch", value: "LAB-02 vs LAB-01", detail: "Zones did not agree, directly or via the asset map." },
  { key: "diversity", label: "Source diversity", status: "unknown", value: 2, detail: "Only 2 of 3 sources ever shared context -- below the diversity threshold." },
];

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    incidentId: "INC-0042",
    createdAt: agoIso(80 * SEC),
    updatedAt: agoIso(80 * SEC),
    status: "open",
    summary: "Phone B entered LAB-01 with a reused credential and joined the network from an unrecognized device.",
    severity: 81,
    confidence: 0.94,
    deviceId: "PHN-B",
    deviceName: "Phone B",
    ipAddress: undefined,
    zoneId: "LAB-01",
    signalIds: INCIDENT_TIMELINE.map((e) => e.eventId),
    timeline: INCIDENT_TIMELINE,
    reasoning: MATCH_CRITERIA,
    evidence: [{ clip_url: "evidence://vision/evt-vis-inc-01.mp4" }],
    recommendedAction: "Dispatch a physical security check to LAB-01 and force-expire the reused credential.",
    ...overrides,
  };
}

/** C. LIVE / IDLE -- connected, healthy, quiet. History exists but nothing
 * has happened recently. */
export const idleFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES.map((d) => ({ ...d, lastSeen: agoIso(6 * MIN) })),
  events: baseEvents(),
  incidents: [],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "connected",
};

/** D. DEVICES PRESENT / NO INCIDENT -- the canonical two-phone story. */
export const twoDevicesFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: baseEvents(),
  incidents: [],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "connected",
};

/** E. EVENT ACTIVITY -- signals actively streaming in. */
export const activityFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: withRecentActivity(),
  incidents: [],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "connected",
};

/** F. CONTEXT EVALUATION -- signals from multiple sources just landed on
 * the same device; the backend is inside its correlation window. */
export const evaluatingFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: [
    ...withRecentActivity(),
    {
      eventId: "evt-ep-03",
      timestamp: agoIso(4 * SEC),
      source: "endpoint",
      eventType: "credential_reuse_detected",
      deviceId: "PHN-B",
      deviceName: "Phone B",
      zoneId: "LAB-01",
      severity: 58,
      confidence: 0.7,
    },
  ],
  incidents: [],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "connected",
  lastEvaluation: {
    evaluatedAt: agoIso(1 * SEC),
    outcome: "no_incident",
    deviceId: "PHN-B",
    deviceName: "Phone B",
    signalIds: ["evt-net-02", "evt-ep-03"],
    criteria: [
      { key: "time", label: "Time", status: "match", value: "7.1 sec" },
      { key: "device", label: "Device", status: "match", value: "Phone B" },
      { key: "network", label: "Network", status: "match", value: "LAB-01" },
      { key: "diversity", label: "Source diversity", status: "unknown", value: 2, detail: "Waiting on a third independent source." },
    ],
  },
};

/** G. ACTIVE INCIDENT. */
export const incidentFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: [...baseEvents(), ...INCIDENT_TIMELINE],
  incidents: [incident()],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "connected",
};

/** H. CONTEXT MISMATCH / NO INCIDENT -- a successful outcome: signals were
 * kept separate because they didn't actually agree. */
export const mismatchFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: baseEvents(),
  incidents: [],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "connected",
  lastEvaluation: {
    evaluatedAt: agoIso(20 * SEC),
    outcome: "no_incident",
    deviceId: "EP-014",
    deviceName: "Workstation EP-014",
    signalIds: ["evt-vis-01", "evt-ep-01"],
    criteria: MISMATCH_CRITERIA,
  },
};

/** I. DEGRADED SOURCES. */
export const degradedFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: baseEvents(),
  incidents: [],
  sourceHealth: [
    { source: "vision", status: "online", lastSeen: agoIso(5 * SEC) },
    { source: "endpoint", status: "degraded", lastSeen: agoIso(4 * MIN), message: "Heartbeat interval exceeded" },
    { source: "network", status: "offline", lastSeen: agoIso(22 * MIN) },
  ],
  realtimeStatus: "connected",
};

/** J. REALTIME DISCONNECTED -- last known state is shown, stale. */
export const disconnectedFixture: MissionControlSnapshot = {
  devices: BASE_DEVICES,
  events: baseEvents(),
  incidents: [incident({ status: "acknowledged" })],
  sourceHealth: HEALTHY_SOURCE_HEALTH,
  realtimeStatus: "disconnected",
};

/** L. ZERO-DATA / FIRST START -- genuinely nothing observed yet. */
export const zeroDataFixture: MissionControlSnapshot = {
  devices: [],
  events: [],
  incidents: [],
  sourceHealth: UNKNOWN_SOURCE_HEALTH,
  realtimeStatus: "connected",
};

/** B. CONNECTING -- REST snapshot not resolved yet; realtime still handshaking. */
export const connectingFixture: MissionControlSnapshot = {
  ...idleFixture,
  realtimeStatus: "connecting",
};

export const missionControlFixtures: Record<Exclude<PreviewKey, "booting" | "error">, MissionControlSnapshot> = {
  idle: idleFixture,
  devices: twoDevicesFixture,
  activity: activityFixture,
  evaluating: evaluatingFixture,
  incident: incidentFixture,
  mismatch: mismatchFixture,
  degraded: degradedFixture,
  disconnected: disconnectedFixture,
  zero: zeroDataFixture,
  connecting: connectingFixture,
};
