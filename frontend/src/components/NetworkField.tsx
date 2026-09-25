import { useMemo, useRef } from "react";
import type { Incident, SentrixEvent, Source } from "../types";
import { sourceColor, sourceLabel } from "../theme";
import { formatRelative } from "../format";
import { Panel } from "./Panel";

interface Props {
  events: SentrixEvent[];
  incidents: Incident[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string | null) => void;
  now: number;
}

interface AssetNode {
  assetId: string;
  zoneId: string;
  lastSource: Source;
  lastEventType: string;
  lastTimestamp: string;
  eventCount: number;
  inOpenIncident: boolean;
  sources: Set<Source>;
}

const BOX = { w: 720, h: 360 };
const ZONE_COL_W = 220;
const ROW_H = 64;
const PAD_TOP = 46;

/**
 * The real, live device/network field: every unique asset SENTRIX has
 * actually observed, grouped by its actual zone. No fabricated devices, no
 * fabricated IPs -- only asset_id / zone_id from real events (see the
 * illustrative two-phone story on the landing page for the demo narrative;
 * this is the operational product, so it renders the real schema).
 */
export function NetworkField({ events, incidents, selectedAssetId, onSelectAsset, now }: Props) {
  // stable ordering across renders so nodes don't jump around as new events arrive
  const zoneOrder = useRef<string[]>([]);
  const assetOrderByZone = useRef<Map<string, string[]>>(new Map());

  const { zones, assets } = useMemo(() => {
    const byAsset = new Map<string, AssetNode>();
    for (const e of events) {
      const zoneId = e.zone_id ?? e.resolved_zone_id ?? "UNZONED";
      const existing = byAsset.get(e.asset_id);
      if (!existing || existing.lastTimestamp < e.timestamp) {
        byAsset.set(e.asset_id, {
          assetId: e.asset_id,
          zoneId,
          lastSource: e.source,
          lastEventType: e.event_type,
          lastTimestamp: e.timestamp,
          eventCount: (existing?.eventCount ?? 0) + 1,
          inOpenIncident: existing?.inOpenIncident ?? false,
          sources: existing?.sources ?? new Set<Source>(),
        });
      } else {
        existing.eventCount += 1;
      }
      byAsset.get(e.asset_id)!.sources.add(e.source);
    }
    const openAssetIds = new Set(incidents.filter((i) => i.status === "OPEN").map((i) => i.asset_id));
    for (const node of byAsset.values()) {
      node.inOpenIncident = openAssetIds.has(node.assetId);
    }

    // maintain stable insertion order for zones and assets within a zone
    for (const node of byAsset.values()) {
      if (!zoneOrder.current.includes(node.zoneId)) zoneOrder.current.push(node.zoneId);
      const list = assetOrderByZone.current.get(node.zoneId) ?? [];
      if (!list.includes(node.assetId)) list.push(node.assetId);
      assetOrderByZone.current.set(node.zoneId, list);
    }

    const orderedZones = zoneOrder.current.filter((z) => assetOrderByZone.current.get(z)?.some((a) => byAsset.has(a)));
    return { zones: orderedZones, assets: byAsset };
  }, [events, incidents]);

  if (assets.size === 0) {
    return (
      <Panel title="Network / Device Field" className="flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <div className="h-2 w-2 animate-pulse_dot rounded-full bg-status-ok" />
          <p className="text-[13px] font-medium text-ink">No assets observed yet</p>
          <p className="max-w-[280px] text-[12px] text-ink-faint">
            Connected assets appear here the moment SENTRIX receives their first signal.
          </p>
        </div>
      </Panel>
    );
  }

  const w = Math.max(BOX.w, zones.length * ZONE_COL_W + 40);
  const maxRows = Math.max(...zones.map((z) => (assetOrderByZone.current.get(z) ?? []).length));
  const h = Math.max(BOX.h, PAD_TOP + maxRows * ROW_H + 40);

  const nodePos = (zoneIdx: number, rowIdx: number) => ({
    x: 40 + zoneIdx * ZONE_COL_W + ZONE_COL_W / 2,
    y: PAD_TOP + rowIdx * ROW_H + ROW_H / 2,
  });

  return (
    <Panel title="Network / Device Field" right={<span className="font-mono text-[10px] text-ink-faint">{assets.size} assets</span>} noPadding className="flex-1" bodyClassName="flex flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="min-w-full">
          {/* zone backgrounds + labels */}
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

          {/* asset nodes */}
          {zones.map((zoneId, zi) => {
            const assetIds = (assetOrderByZone.current.get(zoneId) ?? []).filter((a) => assets.has(a));
            return assetIds.map((assetId, ri) => {
              const node = assets.get(assetId)!;
              const pos = nodePos(zi, ri);
              const color = sourceColor[node.lastSource];
              const ageS = (now - new Date(node.lastTimestamp).getTime()) / 1000;
              const fresh = ageS < 8;
              const selected = selectedAssetId === assetId;
              return (
                <g
                  key={assetId}
                  transform={`translate(${pos.x},${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectAsset(selected ? null : assetId)}
                >
                  {node.inOpenIncident && <circle r="26" fill="none" stroke="#C75D56" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />}
                  {fresh && !node.inOpenIncident && <circle r="22" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />}
                  <circle
                    r="16"
                    fill="#FFFFFF"
                    stroke={node.inOpenIncident ? "#C75D56" : selected ? color : "rgba(18,55,54,0.25)"}
                    strokeWidth={selected || node.inOpenIncident ? 2 : 1.2}
                  />
                  <circle r="4" fill={node.inOpenIncident ? "#C75D56" : color} />
                  <text y="30" textAnchor="middle" fontSize="11" fontWeight="600" fill="#121718" fontFamily="inherit">
                    {node.assetId}
                  </text>
                  <text y="43" textAnchor="middle" fontSize="9" fill="#697576" fontFamily="monospace">
                    {formatRelative(node.lastTimestamp, now)}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {selectedAssetId && assets.has(selectedAssetId) && (
        <AssetDetail node={assets.get(selectedAssetId)!} onClose={() => onSelectAsset(null)} />
      )}
    </Panel>
  );
}

function AssetDetail({ node, onClose }: { node: AssetNode; onClose: () => void }) {
  return (
    <div className="shrink-0 border-t border-line bg-base-500 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-bold text-ink">{node.assetId}</span>
        <button onClick={onClose} className="text-[13px] text-ink-faint hover:text-ink">
          ×
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px]">
        <span className="text-ink-faint">Zone</span>
        <span className="text-right font-mono text-ink">{node.zoneId}</span>
        <span className="text-ink-faint">Last event</span>
        <span className="text-right text-ink">{node.lastEventType.replace(/_/g, " ")}</span>
        <span className="text-ink-faint">Sources</span>
        <span className="text-right text-ink">{Array.from(node.sources).map((s) => sourceLabel[s]).join(", ")}</span>
        <span className="text-ink-faint">Events observed</span>
        <span className="text-right font-mono text-ink">{node.eventCount}</span>
      </div>
    </div>
  );
}
