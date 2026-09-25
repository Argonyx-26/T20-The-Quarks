import type { SentrixEvent } from "../types";
import { sourceColor, sourceLabel } from "../theme";
import { formatClock, formatConfidence } from "../format";

function isImageLike(key: string, value: unknown): value is string {
  return typeof value === "string" && /thumbnail|image|frame/i.test(key);
}

function EvidenceValue({ k, v }: { k: string; v: unknown }) {
  if (isImageLike(k, v)) {
    return <span className="font-mono text-[11.5px] text-ink">{v as string} (thumbnail unavailable outside live feed)</span>;
  }
  if (typeof v === "object" && v !== null) {
    return <pre className="whitespace-pre-wrap font-mono text-[11px] text-ink">{JSON.stringify(v, null, 2)}</pre>;
  }
  return <span className="font-mono text-[11.5px] text-ink">{String(v)}</span>;
}

function KeyValueBlock({ title, data }: { title: string; data: Record<string, unknown> }) {
  const keys = Object.keys(data);
  return (
    <div>
      <span className="text-[11px] text-ink-faint">{title}</span>
      {keys.length === 0 ? (
        <p className="mt-1 text-[11.5px] italic text-ink-faint">No {title.toLowerCase()} attached to this event.</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {keys.map((k) => (
            <div key={k} className="flex flex-col gap-0.5 rounded-sm border border-line-soft bg-base-800/60 px-2 py-1.5">
              <span className="font-mono text-[10px] text-ink-faint">{k}</span>
              <EvidenceValue k={k} v={data[k]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvidenceDrawer({ event, onClose }: { event: SentrixEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-ink/25" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col border-l border-line bg-base-700 animate-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: sourceColor[event.source] }}>
              {sourceLabel[event.source]} evidence
            </span>
            <h3 className="font-mono text-[13px] font-semibold text-ink">{event.event_id}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm border border-line px-2 py-1 text-[11px] text-ink-muted hover:border-ink-faint hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-line-soft pb-3 text-[12px]">
            <Row label="Timestamp" value={formatClock(event.timestamp)} />
            <Row label="Event type" value={event.event_type} />
            <Row label="Asset" value={event.asset_id} />
            <Row label="Zone" value={event.zone_id ?? event.resolved_zone_id ?? "unresolved"} />
            <Row label="Severity" value={String(event.severity)} />
            <Row label="Confidence" value={formatConfidence(event.confidence)} />
          </div>

          <div className="mt-3 flex flex-col gap-4">
            <KeyValueBlock title="Attributes" data={event.attributes} />
            <KeyValueBlock title="Evidence" data={event.evidence} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-faint">{label}</span>
      <span className="font-mono font-medium text-ink">{value}</span>
    </div>
  );
}
