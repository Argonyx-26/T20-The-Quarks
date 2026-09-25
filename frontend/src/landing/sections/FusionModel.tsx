import { useState } from "react";
import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";
import { ContextEngineScene } from "./ContextEngineScene";

const STEPS = [
  {
    n: "01",
    key: "TIME",
    question: "Did these signals happen within the same window?",
    copy: "Events occurring close together may be related, but time alone is not enough.",
    resultLabel: "Δ 8.2s",
    resultNote: "within the 30s correlation window",
  },
  {
    n: "02",
    key: "DEVICE",
    question: "Do the digital events belong to the same device?",
    copy: "Digital events become stronger evidence when they reference the same monitored asset.",
    resultLabel: "Phone B",
    resultNote: "same device context",
  },
  {
    n: "03",
    key: "NETWORK",
    question: "Does the traffic belong to the same network context?",
    copy: "SENTRIX checks whether the network activity belongs to the same device and network context.",
    resultLabel: "192.168.1.37",
    resultNote: "source device = network event",
  },
  {
    n: "04",
    key: "SOURCES",
    question: "Are independent systems supporting the same story?",
    copy: "Independent sources provide stronger contextual evidence than repeated alerts from one source.",
    resultLabel: "3 sources",
    resultNote: "vision, endpoint, network — sufficient diversity",
  },
  {
    n: "05",
    key: "CONFIDENCE",
    question: "Is the combined context strong enough to act on?",
    copy: "Only after enough contextual conditions agree can the system create an incident.",
    resultLabel: "92",
    resultNote: "clears the 75 threshold",
  },
] as const;

// 01 — temporal calibration arc, not a flat timeline
function TimeVisual() {
  const pts = [
    { x: 44, y: 60, t: "21:42:05", who: "Vision" },
    { x: 100, y: 45, t: "21:42:09", who: "Endpoint" },
    { x: 156, y: 60, t: "21:42:13", who: "Network" },
  ];
  return (
    <div className="relative mt-6 h-32">
      <svg viewBox="0 0 200 90" className="h-full w-full">
        <path d="M 20 75 Q 100 15 180 75" fill="none" stroke="rgba(18,55,54,0.14)" strokeWidth="1" />
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const x = (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * 100 + t * t * 180;
          const y = (1 - t) * (1 - t) * 75 + 2 * (1 - t) * t * 15 + t * t * 75;
          return <line key={i} x1={x} y1={y - 3} x2={x} y2={y + 3} stroke="rgba(18,55,54,0.2)" strokeWidth="1" />;
        })}
        {pts.map((p) => (
          <circle key={p.t} cx={p.x} cy={p.y} r="3.5" fill="#0F7A75" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1">
        {pts.map((p) => (
          <div key={p.t} className="text-center">
            <span className="block font-mono text-[9px] text-ink-faint">{p.t}</span>
            <span className="block text-[10px] font-medium text-ink-muted">{p.who}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 02 — two identity layers sliding into registration, not arrows
function DeviceVisual() {
  return (
    <div className="relative mt-6 flex h-32 items-center justify-center">
      <div
        className="absolute h-[76px] w-[150px] rounded-[6px] border border-line-strong/60 bg-base-500/70"
        style={{ transform: "translate(-9px,-5px)" }}
      >
        <span className="absolute left-2.5 top-2 font-mono text-[9px] tracking-[0.05em] text-ink-faint">ENDPOINT</span>
        <span className="absolute bottom-2 left-2.5 text-[12px] font-semibold text-ink">Phone B</span>
        <span className="absolute bottom-2 right-2.5 font-mono text-[9px] text-ink-faint">PHONE-B</span>
      </div>
      <div
        className="absolute h-[76px] w-[150px] rounded-[6px] border border-teal/60 bg-teal/5"
        style={{ transform: "translate(9px,5px)" }}
      >
        <span className="absolute right-2.5 top-2 font-mono text-[9px] tracking-[0.05em] text-teal-dark">NETWORK</span>
        <span className="absolute bottom-2 right-2.5 text-[12px] font-semibold text-ink">Phone B</span>
        <span className="absolute bottom-2 left-2.5 font-mono text-[9px] text-ink-faint">.1.37</span>
      </div>
      <svg width="18" height="18" className="relative z-10">
        <line x1="9" y1="1" x2="9" y2="17" stroke="#08645F" strokeWidth="1" />
        <line x1="1" y1="9" x2="17" y2="9" stroke="#08645F" strokeWidth="1" />
        <circle cx="9" cy="9" r="2" fill="none" stroke="#08645F" strokeWidth="1" />
      </svg>
    </div>
  );
}

// 03 — orbit / topology field, spline paths, no arrowheads
function NetworkVisual() {
  return (
    <div className="relative mt-6 h-32">
      <svg viewBox="0 0 220 110" className="h-full w-full">
        <path id="net-a" d="M 34 85 Q 90 85 112 50" fill="none" stroke="#0F7A75" strokeWidth="1.5" strokeOpacity="0.5" />
        <path id="net-b" d="M 112 50 Q 150 28 186 22" fill="none" stroke="#B98335" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="1 4" strokeLinecap="round" />
        <circle r="2.2" fill="#0F7A75">
          <animateMotion dur="2.2s" repeatCount="indefinite">
            <mpath href="#net-a" />
          </animateMotion>
        </circle>
        <circle r="2.2" fill="#B98335">
          <animateMotion dur="1.8s" repeatCount="indefinite">
            <mpath href="#net-b" />
          </animateMotion>
        </circle>
        <circle cx="34" cy="85" r="4" fill="#FFFFFF" stroke="#0F7A75" strokeWidth="1.5" />
        <circle cx="112" cy="50" r="4" fill="#FFFFFF" stroke="#0F7A75" strokeWidth="1.5" />
        <circle cx="186" cy="22" r="4" fill="#FFFFFF" stroke="#B98335" strokeWidth="1.5" />
      </svg>
      <span className="absolute bottom-0 left-0 font-mono text-[9.5px] text-ink-muted">Phone B · 192.168.1.37</span>
      <span className="absolute left-[46%] top-[38%] font-mono text-[9px] text-teal-dark">LOCAL NETWORK</span>
      <span className="absolute right-0 top-0 font-mono text-[9.5px] text-amber">203.0.113.44</span>
    </div>
  );
}

// 04 — three physical channels registering around a shared center
function SourceVisual() {
  const ch = [
    { l: "VISION", c: "#4779BD", e: "Restricted-zone presence observed", d: "M4 18 Q 60 4 120 20" },
    { l: "ENDPOINT", c: "#785EAB", e: "USB attachment observed", d: "M4 40 Q 60 40 120 40" },
    { l: "NETWORK", c: "#138983", e: "Outbound deviation observed", d: "M4 62 Q 60 76 120 60" },
  ];
  return (
    <div className="mt-6">
      <svg viewBox="0 0 124 80" className="h-16 w-full">
        {ch.map((x) => (
          <path key={x.l} d={x.d} fill="none" stroke={x.c} strokeWidth="1.6" strokeOpacity="0.7" strokeLinecap="round" />
        ))}
        <circle cx="120" cy="40" r="3" fill="none" stroke="rgba(18,55,54,0.3)" strokeWidth="1" />
      </svg>
      <div className="mt-3 flex flex-col gap-2">
        {ch.map((x) => (
          <div key={x.l} className="flex items-baseline gap-2">
            <span className="w-[70px] shrink-0 font-mono text-[9.5px] tracking-[0.05em]" style={{ color: x.c }}>
              {x.l}
            </span>
            <span className="text-[11px] text-ink-muted">{x.e}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 05 — vernier / caliper scale, not a circular ring
function ConfidenceVisual() {
  const ticks = [0, 25, 50, 75, 100];
  return (
    <div className="mt-8">
      <svg viewBox="0 0 220 40" className="w-full">
        <line x1="6" y1="20" x2="214" y2="20" stroke="rgba(18,55,54,0.25)" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={6 + (t / 100) * 208} y1="12" x2={6 + (t / 100) * 208} y2="28" stroke="rgba(18,55,54,0.35)" strokeWidth="1" />
            <text x={6 + (t / 100) * 208} y="40" fontSize="7.5" textAnchor="middle" fill="#8A9596" fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}
        <line x1={6 + 0.75 * 208} y1="6" x2={6 + 0.75 * 208} y2="34" stroke="#B98335" strokeWidth="1.2" strokeDasharray="2 2" />
        <line x1="6" y1="20" x2={6 + 0.92 * 208} y2="20" stroke="#0F7A75" strokeWidth="2.5" />
        <circle cx={6 + 0.92 * 208} cy="20" r="4" fill="#0F7A75" />
      </svg>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-[10px] text-amber">THRESHOLD 75</span>
        <span className="font-mono text-[13px] font-bold text-teal-dark">OBSERVED 92</span>
      </div>
    </div>
  );
}

const VISUALS = [TimeVisual, DeviceVisual, NetworkVisual, SourceVisual, ConfidenceVisual];

const MATCH_ROWS = [
  { c: "TIME", v: "8.2s", ok: true },
  { c: "DEVICE", v: "Phone B = Phone B", ok: true },
  { c: "NETWORK", v: "192.168.1.37 = 192.168.1.37", ok: true },
  { c: "SOURCES", v: "3 / 3", ok: true },
];
const MISMATCH_ROWS = [
  { c: "TIME", v: "8.2s", ok: true },
  { c: "DEVICE", v: "192.168.1.21 ≠ 192.168.1.37", ok: false },
  { c: "NETWORK", v: "192.168.1.21 ≠ 192.168.1.37", ok: false },
  { c: "SOURCES", v: "2 / 3", ok: false },
];

/** Calibration index -- replaces a generic arrow/number stepper. Each row is
 * a measurement mark, not a step-with-arrow; the left border is the "tick"
 * that lights up as a criterion is reached, and stays lit when revisited. */
function CalibrationIndex({
  activeStep,
  highestStep,
  onSelect,
}: {
  activeStep: number;
  highestStep: number;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="flex flex-col" role="tablist" aria-label="Contextual checks">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const reached = highestStep >= n;
        const active = activeStep === n;
        return (
          <button
            key={s.key}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(n)}
            className="group flex items-center gap-3 border-l-2 py-3 pl-4 pr-2 text-left transition-colors"
            style={{ borderColor: active ? "#0F7A75" : reached ? "rgba(15,122,117,0.35)" : "rgba(18,55,54,0.12)" }}
          >
            <span className="w-5 shrink-0 font-mono text-[10.5px]" style={{ color: active ? "#08645F" : reached ? "#0F7A75" : "#8A9596" }}>
              {s.n}
            </span>
            <span
              className="font-mono text-[11.5px] font-bold tracking-[0.04em]"
              style={{ color: active ? "#121718" : reached ? "#465253" : "#8A9596" }}
            >
              {s.key}
            </span>
            <span className="ml-auto h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: reached ? "#0F7A75" : "rgba(18,55,54,0.15)" }} />
          </button>
        );
      })}
    </div>
  );
}

export function FusionModel() {
  const [activeStep, setActiveStep] = useState(0); // 0 = input signals, 1-5 = criteria
  const [highestStep, setHighestStep] = useState(0);
  const [mode, setMode] = useState<"match" | "mismatch">("match");
  const rows = mode === "match" ? MATCH_ROWS : MISMATCH_ROWS;

  const goTo = (n: number) => {
    setActiveStep(n);
    setHighestStep((h) => Math.max(h, n));
  };

  const step = activeStep >= 1 ? STEPS[activeStep - 1] : null;
  const Visual = activeStep >= 1 ? VISUALS[activeStep - 1] : null;

  return (
    <Section id="how-it-thinks" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: "linear-gradient(rgba(18,55,54,0.04) 1px, transparent 1px)", backgroundSize: "100% 96px", opacity: 0.5 }}
      />

      <Reveal className="relative">
        <span className="text-[11px] font-medium tracking-[0.14em] text-ink-faint">02 · THE APPROACH</span>
        <h2 className="mt-3 max-w-[16ch] text-[38px] font-display font-bold leading-[1.0] tracking-tight text-ink sm:text-[52px] lg:text-[60px]">
          Correlation isn't just timestamp matching.
        </h2>
        <p className="mt-4 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-muted">
          Three independent signals arrive. SENTRIX calibrates five contextual dimensions between them before
          deciding whether they belong to one incident.
        </p>
      </Reveal>

      {/* engine + calibration index share one fixed grid */}
      <Reveal delayMs={150} className="relative mt-10">
        <p className="mb-3 font-mono text-[11px] italic tracking-[0.04em] text-ink-faint">
          Independent signals only become an incident after contextual alignment is verified.
        </p>
        <div className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center lg:gap-2">
          <ContextEngineScene activeStep={activeStep} highestStep={highestStep} />
          <div className="border-t border-line pt-2 lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0">
            <CalibrationIndex activeStep={activeStep} highestStep={highestStep} onSelect={goTo} />
          </div>
        </div>
      </Reveal>

      {/* active step detail — only ONE step's content renders at a time */}
      <div className="relative mt-10 grid gap-8 border-b border-line-soft pb-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        {activeStep === 0 || !step || !Visual ? (
          <div>
            <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-ink-faint">INPUT SIGNALS</span>
            <p className="mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-muted">
              Three independent observations enter SENTRIX. Each is real on its own — the question is whether
              they belong to the same story. Select a mark on the calibration index to see how SENTRIX checks.
            </p>
          </div>
        ) : (
          <>
            <div>
              <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-teal-dark">
                {step.n} · {step.key}
              </span>
              <h3 className="mt-2 max-w-[18ch] text-[22px] font-semibold leading-snug text-ink sm:text-[26px]">{step.question}</h3>
              <p className="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-muted">{step.copy}</p>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-mono text-[26px] font-bold text-ink">{step.resultLabel}</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold text-status-ok">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-ok" />
                  MATCH
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-ink-faint">{step.resultNote}</p>
            </div>
            <div className="border border-line bg-base-700 p-5">
              <Visual />
            </div>
          </>
        )}
      </div>

      {/* match / mismatch explorer */}
      <Reveal delayMs={200} className="relative mt-16">
        <p className="text-[11px] font-medium tracking-[0.14em] text-ink-faint">POSITIVE AND NEGATIVE CASES</p>
        <div className="mt-4 inline-flex border border-line">
          {(["match", "mismatch"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 font-mono text-[11.5px] font-semibold tracking-[0.05em] transition-colors ${
                mode === m ? "bg-teal text-white" : "bg-base-700 text-ink-muted hover:text-ink"
              }`}
              aria-pressed={mode === m}
            >
              {m === "match" ? "MATCHED CONTEXT" : "MISMATCHED CONTEXT"}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-x-6 gap-y-3 border border-line bg-base-700 p-5 sm:grid-cols-[140px_1fr_100px]">
          {mode === "mismatch" && (
            <div className="col-span-full mb-1 flex items-center gap-3 border-b border-line-soft pb-4">
              <div className="relative h-10 w-16 shrink-0">
                <div className="absolute h-8 w-12 -translate-x-1 rounded-[4px] border border-line-strong/60 bg-base-500/70" />
                <div className="absolute h-8 w-12 translate-x-1 translate-y-1.5 rounded-[4px] border border-amber/60 bg-amber/5" />
              </div>
              <p className="text-[11.5px] text-ink-muted">
                Device identity layers stop out of registration — the plates do not lock.
              </p>
            </div>
          )}
          {rows.map((r) => (
            <div key={r.c} className="contents">
              <span className="font-mono text-[11.5px] text-ink-faint">{r.c}</span>
              <span className="font-mono text-[12.5px] text-ink">{r.v}</span>
              <span
                className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold"
                style={{ color: r.ok ? "#3C8B72" : "#B98232" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.ok ? "#3C8B72" : "#B98232" }} />
                {r.ok ? "MATCH" : "MISMATCH"}
              </span>
            </div>
          ))}
          <div className="col-span-full mt-3 border-t border-line-soft pt-3">
            {mode === "match" ? (
              <p className="font-mono text-[12.5px] font-bold text-status-critical">CONTEXT RESOLVED → INCIDENT CREATED</p>
            ) : (
              <p className="font-mono text-[12.5px] font-bold text-amber">CONTEXT MISMATCH → EVENTS REMAIN SEPARATE</p>
            )}
          </div>
        </div>
      </Reveal>

      {/* editorial statement */}
      <Reveal delayMs={250} className="relative mt-20 text-center">
        <h3 className="text-[34px] font-display font-bold leading-[1.05] tracking-tight text-ink sm:text-[44px] lg:text-[52px]">
          SAME TIME <span className="text-teal-dark">≠</span> SAME STORY.
        </h3>
      </Reveal>
    </Section>
  );
}
