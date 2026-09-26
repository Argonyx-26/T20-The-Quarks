import type { NormalizedEvent } from "../domain";
import { sourceColor, sourceLabel } from "../theme";
import { formatClock, formatConfidence, formatIp } from "../format";

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

function KeyValueBlock({ title, data }: { title: string; data: Record<string, unknown> | undefined }) {
  const keys = data ? Object.keys(data) : [];
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
              <EvidenceValue k={k} v={data![k]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function EvidenceDrawer({ event, onClose }: { event: NormalizedEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-ink/25" onClick={onClose}>
      <div className="flex h-full w-full max-w-sm flex-col border-l border-line bg-base-700 animate-reveal" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: sourceColor[event.source] }}>
              {sourceLabel[event.source]} evidence
            </span>
            <h3 className="font-mono text-[13px] font-semibold text-ink">{event.eventId}</h3>
          </div>
          <button onClick={onClose} className="rounded-sm border border-line px-2 py-1 text-[11px] text-ink-muted hover:border-ink-faint hover:text-ink">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-line-soft pb-3 text-[12px]">
            <Row label="Timestamp" value={formatClock(event.timestamp)} />
            <Row label="Event type" value={event.eventType} />
            <Row label="Device" value={event.deviceName ?? event.deviceId ?? "unknown"} />
            <Row label="IP" value={formatIp(event.ipAddress)} faint={!event.ipAddress} />
            <Row label="Zone" value={event.zoneId ?? "unresolved"} />
            <Row label="Severity" value={event.severity !== undefined ? String(event.severity) : "—"} />
            <Row label="Confidence" value={event.confidence !== undefined ? formatConfidence(event.confidence) : "—"} />
          </div>

          <div className="mt-3 flex flex-col gap-4">
            <KeyValueBlock title="Attributes" data={event.attributes} />
            <KeyValueBlock title="Evidence" data={asRecord(event.evidence)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, faint }: { label: string; value: string; faint?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-faint">{label}</span>
      <span className={`font-mono font-medium ${faint ? "italic text-ink-faint" : "text-ink"}`}>{value}</span>
    </div>
  );
}
