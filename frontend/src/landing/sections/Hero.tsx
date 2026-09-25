import { Eyebrow, IconTextLink } from "../shared/ui";
import { SignalDiagram } from "./SignalDiagram";

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 2l7 4-7 4V2z" fill="currentColor" />
    </svg>
  );
}

export function Hero() {
  return (
    <div className="relative flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden border-b border-line-soft">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(#151A20 0.6px, transparent 0.6px)",
          backgroundSize: "28px 28px",
          opacity: 0.035,
        }}
      />
      <div className="pointer-events-none absolute inset-y-0 right-[6%] w-px bg-line-strong/50" aria-hidden="true" />

      <div className="relative flex flex-1 flex-col gap-14 px-6 pb-8 pt-10 sm:px-10 lg:flex-row lg:items-center lg:gap-10 lg:px-12 lg:pt-6">
        <div className="w-full lg:w-[42%] lg:shrink-0">
          <div className="animate-rise_sm" style={{ animationDelay: "0ms" }}>
            <Eyebrow index="01">Cyber-physical situational awareness</Eyebrow>
          </div>

          <h1 className="mt-6 text-[42px] font-medium leading-[1.05] tracking-tight sm:text-[52px] lg:text-[58px]">
            <span className="animate-rise_sm block text-ink" style={{ animationDelay: "60ms" }}>
              Security systems
            </span>
            <span className="animate-rise_sm block font-normal italic text-ink-muted" style={{ animationDelay: "120ms" }}>
              see events.
            </span>
            <span className="animate-rise_sm block" style={{ animationDelay: "180ms" }}>
              <span className="font-semibold text-ink">SENTRIX</span>{" "}
              <span className="font-normal italic text-ink-muted">sees</span>
            </span>
            <span className="animate-rise_sm block font-normal italic text-ink-muted" style={{ animationDelay: "240ms" }}>
              relationships.
            </span>
          </h1>

          <div className="animate-rise_sm mt-7" style={{ animationDelay: "320ms" }}>
            <p className="max-w-[42ch] text-[15px] leading-relaxed text-ink-muted">
              SENTRIX correlates physical, endpoint and network signals into a single explainable incident, in real
              time.
            </p>
            <p className="mt-1.5 text-[13px] text-ink-faint">Deterministic fusion. Operator-auditable reasoning.</p>
          </div>

          <div className="animate-rise_sm mt-10 flex flex-wrap items-center gap-5" style={{ animationDelay: "380ms" }}>
            <IconTextLink to="/mission-control" icon={<ArrowIcon />} emphasis>
              Enter Mission Control
            </IconTextLink>
            <span className="hidden h-9 w-px bg-line sm:block" />
            <IconTextLink href="#live" icon={<PlayIcon />}>
              Watch how it works
            </IconTextLink>
          </div>
        </div>

        <div className="relative flex w-full flex-1 items-center justify-center overflow-x-auto lg:justify-end">
          <SignalDiagram />
        </div>
      </div>
    </div>
  );
}
