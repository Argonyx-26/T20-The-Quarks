# Mission Control frontend contract

Owner: frontend. This documents the domain contract Mission Control's UI is
built against (`frontend/src/domain/types.ts`), separate from and layered
on top of the existing backend contract in [`API_CONTRACT.md`](./API_CONTRACT.md).

**Why a separate contract:** every Mission Control component depends only
on `frontend/src/domain/types.ts`. Nothing in `src/components` or
`src/pages` imports a backend wire type. The translation from whatever the
backend actually returns happens in exactly one place:
`frontend/src/services/missionControlApi.ts`. Today that adapter maps the
existing `API_CONTRACT.md` backend onto this contract; as the backend
gains device/network identity, only that file (and, if a field is
genuinely new, `domain/types.ts`) needs to change. Components,
`CorrelationBasis`, `DeviceTopology`, `EventStream`, `IncidentTimeline`,
`ActiveIncidentPanel`, `SourceHealthPanel` do not.

Current source of truth for the shapes below:
`frontend/src/domain/types.ts`.

---

## Snapshot shape

```ts
interface MissionControlSnapshot {
  devices: Device[];
  events: NormalizedEvent[];
  incidents: Incident[];
  sourceHealth: SourceHealth[];
  realtimeStatus: RealtimeStatus; // "connecting" | "connected" | "reconnecting" | "disconnected" | "error"
  lastEvaluation?: FusionEvaluation; // see "Gaps" below
}
```

Fetched once via `missionControlClient.getSnapshot()` on load, then kept
current by `subscribe()`. See "Snapshot + stream architecture" below.

## Device

```ts
interface Device {
  deviceId: string;
  displayName: string;
  deviceType?: string;
  ipAddress?: string;     // omit if unknown -- UI renders "IP unavailable", never fabricates one
  zoneId?: string;
  status: "online" | "offline" | "unknown";
  firstSeen?: string;     // ISO 8601
  lastSeen?: string;      // ISO 8601
}
```

## NormalizedEvent

```ts
interface NormalizedEvent {
  eventId: string;
  timestamp: string;      // ISO 8601
  source: "vision" | "endpoint" | "network";
  eventType: string;
  deviceId?: string;
  assetId?: string;       // kept alongside deviceId during the asset_id -> deviceId transition
  deviceName?: string;
  ipAddress?: string;
  zoneId?: string;
  severity?: number;      // 0-100
  confidence?: number;    // 0.0-1.0
  attributes?: Record<string, unknown>;
  evidence?: unknown;
}
```

## Incident

```ts
interface Incident {
  incidentId: string;
  createdAt: string;
  updatedAt?: string;
  status: "open" | "acknowledged" | "resolved" | "unknown";
  summary: string;
  severity?: number;
  confidence?: number;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  zoneId?: string;
  signalIds: string[];
  timeline: NormalizedEvent[];       // full events, not just id/label pairs
  reasoning: FusionCriterion[];      // structured, see below
  evidence?: unknown[];
  recommendedAction?: string;
}
```

## FusionCriterion (Correlation Basis rows)

```ts
interface FusionCriterion {
  key: string;
  label: string;                        // e.g. "Time", "Device", "Network", "Source diversity"
  status: "match" | "mismatch" | "unknown";
  value?: string | number;              // e.g. "8.2 sec", "Phone B", 3
  detail?: string;                      // one sentence, human-readable
}
```

The frontend renders these rows verbatim (label / value / MATCH-MISMATCH-UNKNOWN
badge / detail). **It never computes match/mismatch itself** — every
criterion arrives pre-decided.

## FusionEvaluation (the correlation outcome, incident or not)

```ts
interface FusionEvaluation {
  evaluatedAt: string;
  outcome: "incident" | "no_incident";
  criteria: FusionCriterion[];
  deviceId?: string;
  deviceName?: string;
  signalIds?: string[];
  incidentId?: string;     // present when outcome === "incident"
}
```

This is what powers the **CONTEXT MISMATCH / NO INCIDENT** state: the
backend evaluated a set of signals, decided they don't correlate, and
still wants to explain *why* (per-criterion) without ever creating an
`Incident` record. Surfaced on `MissionControlSnapshot.lastEvaluation`.

## SourceHealth

```ts
interface SourceHealth {
  source: "vision" | "endpoint" | "network";
  status: "online" | "degraded" | "offline" | "unknown";
  lastSeen?: string;
  message?: string;   // e.g. "Heartbeat interval exceeded"
}
```

`unknown` is not the same as `offline` — it means the frontend has no
information, and must never be silently upgraded to `online`.

## Realtime envelope

```ts
type RealtimeMessage =
  | { type: "event"; data: NormalizedEvent }
  | { type: "incident"; data: Incident }
  | { type: "sourceHealth"; data: SourceHealth[] }
  | { type: "reset" };
```

Transport-agnostic (WebSocket today, SSE would work identically) — see
`MissionControlClient.subscribe(onMessage, onStatusChange)` in
`frontend/src/services/missionControlClient.ts`. Dedup rule: events by
`eventId`, incidents by `incidentId`, devices by `deviceId` (never by
timestamp).

## Optional scenario endpoints

```ts
listScenarios(): Promise<string[]>;
runScenario(name: string): Promise<void>;
runMismatchScenario(): Promise<void>;   // replay whichever scenario demonstrates a mismatch
resetScenario(): Promise<void>;
```

If a given backend doesn't support one of these, the adapter should throw
`BackendActionUnavailableError` rather than no-op — the Operator Console
renders that as a disabled control with an explicit reason, never a silent
failure.

---

## Snapshot + stream architecture

```
GET  missionControlClient.getSnapshot()      -- initial paint, never blank
  |
  v
subscribe(onMessage, onStatusChange)         -- realtime deltas merged in
```

`getSnapshot()` must resolve before the UI subscribes, so a page refresh
never shows an empty dashboard while the socket handshakes.

---

## Gaps against the current backend (`API_CONTRACT.md`)

The adapter (`missionControlApi.ts`) is real and live today — it is not a
stub — but it is honestly limited by what the current backend actually
returns:

1. **No device registry / network identity.** `Device[]` is derived
   client-side from observed `asset_id` on events. `ipAddress` is always
   `undefined`. Needed: either a `/api/devices` endpoint or an `ip` field
   on ingested events.
2. **No structured correlation criteria.** `Incident.reasoning` is
   currently freeform text (`fusion.py`), heuristically labeled into
   `FusionCriterion` rows by the adapter (all rows come back `"match"`,
   since the backend only emits reasoning for incidents it already
   created). Needed: `fusion.py` emitting structured
   `{key, label, status, value, detail}` rows directly.
3. **No mismatch outcome payload.** When signals fail to correlate, the
   backend simply creates nothing — there is no event, no incident, no
   evaluation record. `lastEvaluation` is therefore always `undefined`
   from the live adapter today; the **CONTEXT MISMATCH** and **CONTEXT
   EVALUATION** UI states can only be demonstrated via
   `frontend/src/fixtures/missionControl.ts` (`?preview=mismatch`,
   `?preview=evaluating`) until the backend exposes something like a
   `correlation.evaluated` WS message or a `/api/evaluations` endpoint.
4. **`sensor.health` WS payload is explicitly unstable** per
   `API_CONTRACT.md` — the adapter treats it as a refresh signal and
   re-fetches `/api/health` rather than trusting its shape.

None of the above are faked in production: every one of these gaps
renders as an honestly absent/unknown value (`ipAddress: undefined` →
"IP unavailable", `lastEvaluation: undefined` → no mismatch card, health
`"unknown"` → never coerced to `"online"`).
