import { useEffect, useMemo, useRef, useState } from "react";
import type { Device, Incident, MissionControlSnapshot } from "../domain";
import { deviceStatusColor, deviceStatusLabel } from "../theme";
import { formatIp, formatRelative } from "../format";
import { Panel } from "./Panel";
import { StatusDot } from "./atoms";
import { PairingPanel } from "./PairingPanel";

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
const HUB_X = 32; // SENTRIX hub position (left side)

export function DeviceTopology({ devices, incidents, lastEvaluation, selectedDeviceId, onSelectDevice, highlightedDeviceId, now }: Props) {
  const zoneOrder = useRef<string[]>([]);
  const deviceOrderByZone = useRef<Map<string, string[]>>(new Map());
  const [pairingOpen, setPairingOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Tracks the actual rendered container size so the topology genuinely
  // fills wide viewports (1920x1080) instead of centering a small,
  // fixed-size diagram inside a lot of empty grey space.
  const [containerSize, setContainerSize] = useState({ width: MIN_W, height: MIN_H });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      <Panel
        title="Device / Network Topology"
        right={<PairDeviceButton onClick={() => setPairingOpen(true)} />}
        className="flex-1"
      >
        <div className="flex h-full max-h-[220px] flex-col items-center justify-center gap-2 text-center">
          <div className="h-2 w-2 animate-pulse_dot rounded-full bg-status-ok" />
          <p className="text-[13px] font-medium text-ink">No registered devices</p>
          <p className="max-w-[280px] text-[12px] text-ink-faint">Pair a phone to begin device monitoring.</p>
        </div>
        {pairingOpen && <PairingPanel devices={devices} onClose={() => setPairingOpen(false)} />}
      </Panel>
    );
  }

  const openAssetIds = new Set(incidents.filter((i) => i.status === "open").map((i) => i.deviceId).filter(Boolean));
  const mismatchDeviceId = lastEvaluation?.outcome === "no_incident" ? lastEvaluation.deviceId : null;

  const byId = new Map(devices.map((d) => [d.deviceId, d]));
  const maxRows = Math.max(1, ...zones.map((z) => (deviceOrderByZone.current.get(z) ?? []).length));
  // Zone columns stretch to fill the actual measured container width at
  // wide viewports (1920x1080) instead of leaving a fixed-size diagram
  // surrounded by empty grey space -- never shrink below the minimum
  // needed to read a zone label + node comfortably.
  const colW = Math.max(ZONE_COL_W, zones.length > 0 ? (containerSize.width - 40) / zones.length : ZONE_COL_W);
  const w = Math.max(containerSize.width, zones.length * colW + 40, MIN_W);
  const h = Math.max(containerSize.height, PAD_TOP + maxRows * ROW_H + 40, MIN_H);

  const nodePos = (zoneIdx: number, rowIdx: number) => ({
    x: 40 + zoneIdx * colW + colW / 2,
    y: PAD_TOP + rowIdx * ROW_H + ROW_H / 2,
  });

  const getConnectionLineStyle = (device: Device) => {
    const status = device.status;
    if (status === "online") {
      return { stroke: "#168B84", strokeWidth: 1.5, strokeOpacity: 0.35, strokeDasharray: undefined as string | undefined };
    } else if (status === "degraded") {
      return { stroke: "#B9842D", strokeWidth: 1.3, strokeOpacity: 0.4, strokeDasharray: "6 4" as string };
    } else if (status === "offline") {
      return { stroke: "#CB514F", strokeWidth: 1.5, strokeOpacity: 0.5, strokeDasharray: "8 6" as string };
    }
    return { stroke: "#8A9596", strokeWidth: 1, strokeOpacity: 0.25, strokeDasharray: "4 8" as string };
  };

  return (
    <Panel
      title="Device / Network Topology"
      right={
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-ink-faint">{devices.length} devices</span>
          <PairDeviceButton onClick={() => setPairingOpen(true)} />
        </div>
      }
      noPadding
      className="flex-1"
      bodyClassName="flex flex-col"
    >
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-3">
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="min-w-full">
          {/* SENTRIX Hub (left side) */}
          <g transform={`translate(${HUB_X}, ${h / 2 - 20})`}>
            <rect x="0" y="0" width="40" height="40" rx="8" fill="#E8ECEC" stroke="#168B84" strokeWidth="1.5" />
            <text x="20" y="26" textAnchor="middle" fontFamily="IBM Plex Sans, system-ui" fontSize="11" fontWeight="bold" fill="#121718">
              SX
            </text>
            <circle cx="8" cy="8" r="4" fill="#168B84" />
          </g>

          {zones.map((zoneId, zi) => (
            <g key={zoneId}>
              <rect
                x={20 + zi * colW}
                y={16}
                width={colW - 12}
                height={h - 30}
                rx="6"
                fill="rgba(18,55,54,0.02)"
                stroke="rgba(18,55,54,0.08)"
                strokeWidth="1"
              />
              <text x={20 + zi * colW + 10} y={32} fontSize="10" fontWeight="700" letterSpacing="0.5" fill="#697576" fontFamily="monospace">
                {zoneId}
              </text>
            </g>
          ))}

          {/* Connection lines from SENTRIX hub to each device */}
          {zones.map((zoneId, zi) => {
            const deviceIds = (deviceOrderByZone.current.get(zoneId) ?? []).filter((id) => byId.has(id));
            return deviceIds.map((deviceId) => {
              const device = byId.get(deviceId)!;
              const pos = nodePos(zi, 0); // Use first row position for line origin
              const lineStyle = getConnectionLineStyle(device);

              // Draw curved line from hub to device
              const hubY = h / 2;
              const ctrlX = 20 + zi * colW - 60;

              return (
                <path
                  key={`conn-${deviceId}`}
                  d={`M ${HUB_X + 40} ${hubY} C ${ctrlX} ${hubY}, ${ctrlX} ${pos.y}, ${pos.x - colW / 2 + 20} ${pos.y}`}
                  fill="none"
                  stroke={lineStyle.stroke}
                  strokeWidth={lineStyle.strokeWidth}
                  strokeOpacity={lineStyle.strokeOpacity}
                  strokeDasharray={lineStyle.strokeDasharray}
                  strokeLinecap="round"
                />
              );
            });
          })}

          {/* Zone inter-device links (correlated devices sharing a zone) */}
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
                  {/* Offline indicator */}
                  {device.status === "offline" && (
                    <g transform="translate(18, -18)">
                      <circle r="8" fill="#F8FAFA" stroke="#CB514F" strokeWidth="1.5" />
                      <line x1="-4" y1="-4" x2="4" y2="4" stroke="#CB514F" strokeWidth="2" strokeLinecap="round" />
                      <line x1="-4" y1="4" x2="4" y2="-4" stroke="#CB514F" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  )}
                </g>
              );
            });
          })}
        </svg>
      </div>

      {selectedDeviceId && byId.has(selectedDeviceId) && (
        <DeviceDetail device={byId.get(selectedDeviceId)!} onClose={() => onSelectDevice(null)} />
      )}
      {pairingOpen && <PairingPanel devices={devices} onClose={() => setPairingOpen(false)} />}
    </Panel>
  );
}

function PairDeviceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-sm border border-teal/50 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-teal-dark transition-colors hover:border-teal hover:bg-teal-ultrapale"
    >
      PAIR DEVICE
    </button>
  );
}

function DeviceDetail({ device, onClose }: { device: Device; onClose: () => void }) {
  const statusColor = deviceStatusColor[device.status];
  const statusLabel = deviceStatusLabel[device.status];
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
        <span className="text-right font-mono text-ink flex items-center justify-end gap-1.5" style={{ color: statusColor }}>
          <StatusDot color={statusColor} />
          {statusLabel}
        </span>
        <span className="text-ink-faint">Zone</span>
        <span className="text-right font-mono text-ink">{device.zoneId ?? "LOCAL NETWORK"}</span>
        <span className="text-ink-faint">IP address</span>
        <span className={`text-right font-mono ${device.ipAddress ? "text-ink" : "italic text-ink-faint"}`}>{formatIp(device.ipAddress)}</span>
        <span className="text-ink-faint">Device type</span>
        <span className="text-right text-ink">{device.deviceType ?? "unclassified"}</span>
        <span className="text-ink-faint">First seen</span>
        <span className="text-right font-mono text-ink">{device.firstSeen ? new Date(device.firstSeen).toLocaleTimeString() : "unknown"}</span>
        <span className="text-ink-faint">Last seen</span>
        <span className="text-right font-mono text-ink">{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : "unknown"}</span>
      </div>
    </div>
  );
}
