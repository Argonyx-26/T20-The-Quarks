const DOMAINS = [
  { label: "VISION", desc: "Physical space" },
  { label: "ENDPOINT", desc: "Device activity" },
  { label: "NETWORK", desc: "Network behavior" },
];

function VennIcon() {
  return (
    <svg width="30" height="18" viewBox="0 0 30 18" fill="none">
      <circle cx="11" cy="9" r="8" stroke="#8991A0" strokeOpacity="0.6" />
      <circle cx="19" cy="9" r="8" stroke="#8991A0" strokeOpacity="0.6" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="7" width="2" height="4" fill="#8991A0" />
      <rect x="6" y="3" width="2" height="12" fill="#8991A0" />
      <rect x="11" y="0" width="2" height="18" fill="#8991A0" />
      <rect x="16" y="5" width="2" height="8" fill="#8991A0" />
    </svg>
  );
}

/** Persistent site-wide chrome, mirrors the sticky top Nav. Height must stay
 * in sync with the `lg:pb-20` bottom padding Landing.tsx reserves for it.
 * Hidden below `lg`: at narrow widths its content only overflows and clips
 * rather than earning a permanently fixed strip of screen. */
export function SystemStrip() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 hidden h-12 overflow-x-auto border-t border-line-soft bg-base-800/40 backdrop-blur-md lg:block">
      <div className="flex h-full min-w-max items-center divide-x divide-line-soft px-6 sm:px-10 lg:px-12 text-[10px]">
        <div className="flex flex-col gap-2 py-4 pr-8">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-ink-faint">02</span>
            <span className="h-px w-6 bg-line-strong" />
          </div>
          <p className="text-[11px] font-medium leading-relaxed tracking-[0.14em] text-ink-muted">
            THREE DOMAINS.
            <br />
            ONE CONTEXT.
          </p>
        </div>
        {DOMAINS.map((d) => (
          <div key={d.label} className="flex flex-col justify-center gap-1 px-8 py-4">
            <span className="font-mono text-[11px] tracking-wide text-ink">{d.label}</span>
            <span className="text-[11.5px] text-ink-faint">{d.desc}</span>
          </div>
        ))}
        <div className="flex flex-col gap-2 px-8 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-ink-faint">03</span>
            <span className="h-px w-6 bg-line-strong" />
          </div>
          <p className="text-[11px] font-medium leading-relaxed tracking-[0.14em] text-ink-muted">
            CONTEXT CREATES
            <br />
            CLARITY.
          </p>
        </div>
        <div className="flex items-center px-8 py-4">
          <VennIcon />
        </div>
        <div className="flex items-center px-8 py-4">
          <BarsIcon />
        </div>
      </div>
    </div>
  );
}
