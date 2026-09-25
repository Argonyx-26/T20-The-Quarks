import type { ReactNode } from "react";

export interface EvidenceMeta {
  label: string;
  value: string;
}

interface Props {
  index: string;
  domainCaption: string;
  label: string;
  color: string;
  icon: ReactNode;
  timestamp: string;
  eventLines: [string, string];
  meta: EvidenceMeta[];
  visual: ReactNode;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
}

export function EventEvidenceCard({ index, domainCaption, label, color, icon, timestamp, eventLines, meta, visual, dimmed, onHover }: Props) {
  return (
    <div
      className="flex w-[212px] shrink-0 flex-col transition-opacity duration-normal"
      style={{ opacity: dimmed ? 0.45 : 1 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-ink-faint">{index}</span>
        <span className="text-[10.5px] tracking-[0.1em] text-ink-faint">{domainCaption}</span>
      </div>

      <div
        className="flex flex-1 flex-col rounded-[4px] border bg-base-900/70 transition-transform duration-normal hover:-translate-y-0.5"
        style={{ borderColor: `${color}40` }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: `${color}26` }}>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color }}>
              {label}
            </span>
          </div>
          <span style={{ color }}>{icon}</span>
        </div>

        <div className="flex h-[132px] items-center justify-center border-b" style={{ borderColor: `${color}1F` }}>
          {visual}
        </div>

        <div className="px-4 pt-3">
          <span className="font-mono text-[10.5px] text-ink-faint">{timestamp}</span>
          <p className="mt-2 text-[13.5px] font-medium leading-snug text-ink">
            {eventLines[0]}
            <br />
            {eventLines[1]}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t px-4 py-3" style={{ borderColor: `${color}1F` }}>
          {meta.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-3">
              <span className="font-mono text-[9.5px] tracking-[0.08em] text-ink-faint">{m.label}</span>
              <span className="truncate font-mono text-[11px] text-ink">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
