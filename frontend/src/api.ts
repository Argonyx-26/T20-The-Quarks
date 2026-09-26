import type {
  ConfigResponse,
  HealthResponse,
  Incident,
  PairingConfirmResponse,
  PairingCreateResponse,
  PairingStatusResponse,
  SentrixEvent,
  WireDevice,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  config: () => request<ConfigResponse>("/api/config"),
  events: (limit = 200) =>
    request<{ count: number; events: SentrixEvent[] }>(`/api/events?limit=${limit}`),
  incidents: () => request<{ count: number; incidents: Incident[] }>("/api/incidents"),
  scenarios: () => request<{ scenarios: string[] }>("/api/demo/scenarios"),
  reset: () => request<{ status: string }>("/api/demo/reset", { method: "POST" }),
  replay: (name: string, live = true, speed = 1) =>
    request(`/api/demo/replay/${encodeURIComponent(name)}?live=${live}&speed=${speed}`, {
      method: "POST",
    }),
  setIncidentStatus: (incidentId: string, status: string) =>
    request<Incident>(`/api/incidents/${encodeURIComponent(incidentId)}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  devices: () => request<{ count: number; devices: WireDevice[] }>("/api/devices"),
  createPairing: () => request<PairingCreateResponse>("/api/pairing", { method: "POST" }),
  getPairingStatus: (token: string) => request<PairingStatusResponse>(`/api/pairing/${encodeURIComponent(token)}`),
  confirmPairing: (token: string, body: { display_name?: string; device_type?: string }) =>
    request<PairingConfirmResponse>(`/api/pairing/${encodeURIComponent(token)}/confirm`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deviceHeartbeat: (deviceId: string, deviceToken: string) =>
    request<WireDevice>(`/api/devices/${encodeURIComponent(deviceId)}/heartbeat`, {
      method: "POST",
      headers: { "X-Device-Token": deviceToken },
    }),
};

export { ApiError, API_BASE };
