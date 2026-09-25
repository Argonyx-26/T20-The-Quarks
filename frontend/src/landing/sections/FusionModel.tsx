import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";

const DIMENSIONS = ["Time", "Asset", "Zone", "Severity", "Confidence"];

const CRITERIA = [
  { label: "Time span", value: "11.0s", note: "inside the 30s correlation window", pass: true },
  { label: "Asset", value: "LAB-01", note: "shared across all three signals", pass: true },
  { label: "Zone", value: "RESTRICTED-LAB", note: "resolved via the asset-zone map", pass: true },
  { label: "Source diversity", value: "3 / 3", note: "vision, endpoint, network all present", pass: true },
  { label: "Combined confidence", value: "98.6%", note: "noisy-OR across 3 signals", pass: true },
];

export function FusionModel() {
  return (
    <Section id="how-it-thinks">
      <h2 className="max-w-[20ch] text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
        Correlation isn't a matching timestamp.
      </h2>
      <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-ink-muted">
        Two events close in time are a coincidence, not a story. SENTRIX only groups events that share
        positive, traceable context — the same physical asset, or a zone one maps to directly — within a
        configured window, and only once enough independent sources agree.
      </p>

      <Reveal className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-4">
        <>
          {DIMENSIONS.map((d, i) => (
            <span key={d} className="flex items-center gap-3">
              <span className="rounded-sm border border-line bg-base-700 px-3.5 py-2 font-mono text-[12px] text-ink">
                {d}
              </span>
              {i < DIMENSIONS.length - 1 && <span className="text-ink-faint">×</span>}
            </span>
          ))}
          <span className="text-ink-faint">=</span>
          <span className="rounded-sm border border-amber/40 bg-amber/10 px-3.5 py-2 font-mono text-[12px] text-amber">
            Context
          </span>
        </>
      </Reveal>

      <div className="mt-12 rounded-sm border border-line bg-base-700">
        <div className="border-b border-line px-4 py-2.5 text-[11px] font-semibold tracking-wide text-ink-muted">
          Correlation basis — positive_correlation fixture
        </div>
        <div className="flex flex-col divide-y divide-line-soft">
          {CRITERIA.map((c, i) => (
            <Reveal key={c.label} delayMs={i * 100}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-baseline gap-3">
                  <span className="w-[150px] shrink-0 text-[12.5px] text-ink-muted">{c.label}</span>
                  <span className="font-mono text-[13px] text-ink">{c.value}</span>
                  <span className="hidden text-[12px] text-ink-faint sm:inline">{c.note}</span>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-status-ok">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-ok" />
                  match
                </span>
              </div>
            </Reveal>
          ))}
          <Reveal delayMs={CRITERIA.length * 100}>
            <div className="flex items-center justify-between bg-amber/10 px-4 py-3">
              <span className="font-mono text-[12px] tracking-wide text-amber">CORRELATION CRITERIA SATISFIED</span>
              <span className="font-mono text-[12px] text-status-critical">INC-0001 CREATED</span>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
