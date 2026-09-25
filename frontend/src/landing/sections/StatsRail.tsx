const STATS = [
  { value: "02", label: "CONNECTED DEVICES" },
  { value: "03", label: "EVENTS OBSERVED" },
  { value: "01", label: "NETWORK EVENT" },
  { value: "3/3", label: "SOURCES ONLINE" },
  { value: "01", label: "INCIDENT CREATED" },
];

/** Numbers mirror the real `positive_correlation` demo fixture (see
 * FusionModel/ProductPreview below) -- not invented business metrics. */
export function StatsRail() {
  return (
    <div className="border-y border-line-soft bg-base-700">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-stretch justify-center divide-x divide-line-soft px-6 sm:px-10 lg:px-16">
        {STATS.map((s) => (
          <div key={s.label} className="flex min-w-[140px] flex-1 flex-col items-center gap-2 px-6 py-8 text-center">
            <span className="font-display text-[38px] font-bold leading-none text-ink sm:text-[46px]">{s.value}</span>
            <span className="font-mono text-[10.5px] font-medium tracking-[0.1em] text-ink-muted">{s.label}</span>
          </div>
        ))}
        <div className="flex min-w-[140px] flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse_dot rounded-full bg-teal-bright" />
            <span className="font-mono text-[12px] font-semibold tracking-[0.1em] text-teal-dark">LIVE</span>
          </div>
          <span className="text-[10.5px] text-ink-faint">Demo scenario · positive_correlation fixture</span>
        </div>
      </div>
    </div>
  );
}
