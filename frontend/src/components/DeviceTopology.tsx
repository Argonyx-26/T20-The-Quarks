import { useMemo, useRef } from "react";
import type { Device, Incident, MissionControlSnapshot } from "../domain";
import { deviceStatusColor } from "../theme";
import { formatIp, formatRelative } from "../format";
import { Panel } from "./Panel";

interface Props {
  devices: Device[];
  incidents: Incident[];
  lastEvaluation: MissionControlSnapshot["lastEvaluation"];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  highlightedDeviceId: string | null;
  now: number;
}

const ZONE_COL_W = 220;
const ROW_H = 68;
const PAD_TOP = 46;
const MIN_W = 640;
const MIN_H = 320;

export function DeviceTopology({ devices, incidents, lastEvaluation, selectedDeviceId, onSelectDevice, highlightedDeviceId, now }: Props) {
  const zoneOrder = useRef<string[]>([]);
  const deviceOrderByZone = useRef<Map<string, string[]>>(new Map());

  const zones = useMemo(() => {
    for (const d of devices) {
      const zoneId = d.zoneId ?? "LOCAL NETWORK";
      if (!zoneOrder.current.includes(zoneId)) zoneOrder.current.push(zoneId);
      const list = deviceOrderByZone.current.get(zoneId) ?? [];
      if (!list.includes(d.deviceId)) list.push(d.deviceId);
      deviceOrderByZone.current.set(zoneId, list);
    }
    const known = new Set(devices.map((d) => d.deviceId));
    return zoneOrder.current.filter((z) => (deviceOrderByZone.current.get(z) ?? []).some((id) => known.has(id)));
  }, [devices]);

  if (devices.length === 0) {
    return (
      <Panel title="Device / Network Topology" className="flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <div className="h-2 w-2 animate-pulse_dot rounded-full bg-status-ok" />
          <p className="text-[13px] font-medium text-ink">No devices observed yet</p>
          <p className="max-w-[280px] text-[12px] text-ink-faint">
            Devices appear here the moment SENTRIX receives their first signal.
          </p>
        </div>
      </Panel>
    );
  }

  const openAssetIds = new Set(incidents.filter((i) => i.status === "open").map((i) => i.deviceId).filter(Boolean));
  const mismatchDeviceId = lastEvaluation?.outcome === "no_incident" ? lastEvaluation.deviceId : null;

  const byId = new Map(devices.map((d) => [d.deviceId, d]));
  const w = Math.max(MIN_W, zones.length * ZONE_COL_W + 40);
  const maxRows = Math.max(1, ...zones.map((z) => (deviceOrderByZone.current.get(z) ?? []).length));
  const h = Math.max(MIN_H, PAD_TOP + maxRows * ROW_H + 40);

  const nodePos = (zoneIdx: number, rowIdx: number) => ({
    x: 40 + zoneIdx * ZONE_COL_W + ZONE_COL_W / 2,
    y: PAD_TOP + rowIdx * ROW_H + ROW_H / 2,
  });

  return (
    <Panel
      title="Device / Network Topology"
      right={<span className="font-mono text-[10px] text-ink-faint">{devices.length} devices</span>}
      noPadding
      className="flex-1"
      bodyClassName="flex flex-col"
    >
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="min-w-full">
          {zones.map((zoneId, zi) => (
            <g key={zoneId}>
              <rect
                x={20 + zi * ZONE_COL_W}
                y={16}
                width={ZONE_COL_W - 12}
                height={h - 30}
                rx="6"
                fill="rgba(18,55,54,0.02)"
                stroke="rgba(18,55,54,0.08)"
                strokeWidth="1"
              />
              <text x={20 + zi * ZONE_COL_W + 10} y={32} fontSize="10" fontWeight="700" letterSpacing="0.5" fill="#697576" fontFamily="monospace">
                {zoneId}
              </text>
            </g>
          ))}

          {/* curved link showing correlated devices sharing a zone, when 2+ devices in the same zone are online */}
          {zones.map((zoneId, zi) => {
            const ids = (deviceOrderByZone.current.get(zoneId) ?? []).filter((id) => byId.has(id));
            if (ids.length < 2) return null;
            return ids.slice(1).map((id, i) => {
              const a = nodePos(zi, 0);
              const b = nodePos(zi, i + 1);
              const active = openAssetIds.has(ids[0]) || openAssetIds.has(id);
              return (
                <path
                  key={`${zoneId}-link-${id}`}
                  d={`M ${a.x} ${a.y} C ${a.x + 46} ${a.y}, ${b.x + 46} ${b.y}, ${b.x} ${b.y}`}
                  fill="none"
                  stroke={active ? "#C75D56" : "#168B84"}
                  strokeWidth={active ? 1.4 : 1}
                  strokeOpacity={active ? 0.5 : 0.22}
                  strokeDasharray={active ? undefined : "2 4"}
                />
              );
            });
          })}

          {zones.map((zoneId, zi) => {
            const deviceIds = (deviceOrderByZone.current.get(zoneId) ?? []).filter((id) => byId.has(id));
            return deviceIds.map((deviceId, ri) => {
              const device = byId.get(deviceId)!;
              const pos = nodePos(zi, ri);
              const inOpenIncident = openAssetIds.has(deviceId);
              const isMismatch = mismatchDeviceId === deviceId;
              const selected = selectedDeviceId === deviceId;
              const highlighted = highlightedDeviceId === deviceId;
              const ringColor = inOpenIncident ? "#C75D56" : isMismatch ? "#B9842D" : deviceStatusColor[device.status];
              return (
                <g
                  key={deviceId}
                  transform={`translate(${pos.x},${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectDevice(selected ? null : deviceId)}
                >
                  {inOpenIncident && <circle r="27" fill="none" stroke="#C75D56" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.75" />}
                  {(highlighted || device.status === "online") && !inOpenIncident && (
                    <circle r="23" fill="none" stroke={ringColor} strokeWidth={highlighted ? 1.6 : 1} opacity={highlighted ? 0.75 : 0.35} />
                  )}
                  <circle
                    r="16"
                    fill="#FFFFFF"
                    stroke={selected || highlighted ? ringColor : inOpenIncident ? "#C75D56" : "rgba(18,55,54,0.25)"}
                    strokeWidth={selected || highlighted || inOpenIncident ? 2 : 1.2}
                  />
                  <circle r="4" fill={ringColor} />
                  <text y="31" textAnchor="middle" fontSize="11" fontWeight="600" fill="#121718" fontFamily="inherit">
                    {device.displayName}
                  </text>
                  <text y="44" textAnchor="middle" fontSize="9" fill="#697576" fontFamily="monospace">
                    {device.lastSeen ? formatRelative(device.lastSeen, now) : "never"}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {selectedDeviceId && byId.has(selectedDeviceId) && (
        <DeviceDetail device={byId.get(selectedDeviceId)!} onClose={() => onSelectDevice(null)} />
      )}
    </Panel>
  );
}

function DeviceDetail({ device, onClose }: { device: Device; onClose: () => void }) {
  return (
    <div className="shrink-0 border-t border-line bg-base-500 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-bold text-ink">{device.displayName}</span>
        <button onClick={onClose} className="text-[13px] text-ink-faint hover:text-ink">
          ×
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px]">
        <span className="text-ink-faint">Status</span>
        <span className="text-right font-mono text-ink" style={{ color: deviceStatusColor[device.status] }}>
          {device.status}
        </span>
        <span className="text-ink-faint">Zone</span>
        <span className="text-right font-mono text-ink">{device.zoneId ?? "LOCAL NETWORK"}</span>
        <span className="text-ink-faint">IP address</span>
        <span className={`text-right font-mono ${device.ipAddress ? "text-ink" : "italic text-ink-faint"}`}>{formatIp(device.ipAddress)}</span>
        <span className="text-ink-faint">Device type</span>
        <span className="text-right text-ink">{device.deviceType ?? "unclassified"}</span>
        <span className="text-ink-faint">First seen</span>
        <span className="text-right font-mono text-ink">{device.firstSeen ? new Date(device.firstSeen).toLocaleTimeString() : "unknown"}</span>
      </div>
    </div>
  );
}
