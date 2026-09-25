type SourceKey = "vision" | "endpoint" | "network";

const SOURCES: { key: SourceKey; label: string; color: string; lines: [string, string]; time: string }[] = [
  { key: "vision", label: "VISION", color: "#4779D8", lines: ["Person detected", "in restricted zone"], time: "T + 0.0s" },
  { key: "endpoint", label: "ENDPOINT", color: "#805EC7", lines: ["USB device", "attached"], time: "T + 5.0s" },
  { key: "network", label: "NETWORK", color: "#2A9698", lines: ["Outbound anomaly", "detected"], time: "T + 11.0s" },
];

const DELAYS: Record<SourceKey, number> = { vision: 300, endpoint: 700, network: 1100 };

function Thumbnail({ source, color }: { source: SourceKey; color: string }) {
  if (source === "vision") {
    return (
      <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
        <g stroke={color} strokeOpacity="0.75" strokeWidth="1.3" fill="none">
          <circle cx="28" cy="19" r="5" />
          <path d="M 18 38 C 18 28, 38 28, 38 38" />
        </g>
      </svg>
    );
  }
  if (source === "endpoint") {
    return (
      <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
        <g stroke={color} strokeOpacity="0.75" strokeWidth="1.3" fill="none">
          <rect x="17" y="14" width="22" height="12" rx="2" />
          <path d="M 23 26 L 23 33 M 33 26 L 33 33 M 19 33 L 37 33" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
      <g stroke={color} strokeOpacity="0.75" strokeWidth="1.2" fill="none">
        <circle cx="18" cy="17" r="2.3" fill={color} fillOpacity="0.8" stroke="none" />
        <circle cx="38" cy="21" r="2.3" fill={color} fillOpacity="0.8" stroke="none" />
        <circle cx="23" cy="37" r="2.3" fill={color} fillOpacity="0.8" stroke="none" />
        <path d="M 18 17 L 38 21 M 18 17 L 23 37 M 38 21 L 23 37" />
      </g>
    </svg>
  );
}

/** Vertical signal sequence used on mobile / narrow viewports, where the
 * spatial hero field (lg+) is too dense to recompose meaningfully — this is
 * the "simplified Context Core + vertical signal sequence" mobile fallback. */
export function SignalDiagram() {
  return (
    <div className="flex w-full flex-col gap-0">
      {SOURCES.map((s, i) => (
        <div key={s.key} className="flex gap-3" style={{ animation: `rise-in 0.5s ease-out ${DELAYS[s.key]}ms both` }}>
          <div className="flex flex-col items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border" style={{ borderColor: `${s.color}4D`, backgroundColor: "#F4F6F7" }}>
              <Thumbnail source={s.key} color={s.color} />
            </div>
            {i < SOURCES.length - 1 && <span className="my-1 h-6 w-px flex-1" style={{ backgroundColor: `${s.color}33` }} />}
          </div>
          <div className="flex-1 pb-6">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color: s.color }}>
                {s.label}
              </span>
              <span className="font-mono text-[10px] text-ink-faint">{s.time}</span>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink">
              {s.lines[0]} {s.lines[1]}
            </p>
          </div>
        </div>
      ))}

      <div className="flex gap-3" style={{ animation: "rise-in 0.5s ease-out 1900ms both" }}>
        <div className="flex flex-col items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-line-strong bg-base-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" style={{ animation: "spin-slow 5s linear infinite" }}>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#151A20" strokeOpacity="0.5" strokeWidth="1.6" strokeDasharray="9 5" />
            </svg>
          </div>
          <span className="my-1 h-6 w-px flex-1 bg-line-strong/30" />
        </div>
        <div className="flex-1 pb-6">
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-ink">FUSION</span>
          <p className="mt-1 text-[12px] text-ink-faint">3 sources · 11.0s span · context match confirmed</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full bg-status-critical" />
        </div>
        <div
          className="flex-1 rounded-[4px] border-y border-r py-3 pl-3 pr-3"
          style={{ borderColor: "rgba(203,81,79,0.3)", borderLeft: "2px solid rgba(203,81,79,0.7)", backgroundColor: "#F7ECEB", animation: "rise-in 0.5s ease-out 2400ms both" }}
        >
          <span className="font-mono text-[10px] tracking-[0.1em] text-status-critical">INCIDENT</span>
          <p className="mt-1 text-[13.5px] font-medium leading-snug text-ink">Suspicious multi-signal activity</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-[5px] border border-line-strong px-2 py-1 font-mono text-[9.5px] text-ink">LAB-01</span>
            <span className="rounded-[5px] border border-status-critical/40 bg-status-critical/10 px-2 py-1 font-mono text-[9.5px] text-status-critical">
              RESTRICTED
            </span>
            <span className="ml-auto font-mono text-[10.5px] font-medium text-status-critical">98.6%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
