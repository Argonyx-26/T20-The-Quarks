import { Eyebrow, IconTextLink } from "../shared/ui";
import { SignalDiagram } from "./SignalDiagram";
import { PhoneNetworkField } from "./PhoneNetworkField";
import { LiveTransfersWidget } from "../components/LiveTransfersWidget";

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

      <div className="relative mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-10 px-6 pb-8 pt-10 sm:px-10 lg:flex-row lg:items-center lg:gap-10 lg:px-16 lg:pt-6">
        <div className="relative z-10 w-full lg:w-[38%] lg:shrink-0">
          <div className="animate-rise_sm" style={{ animationDelay: "0ms" }}>
            <Eyebrow index="01">Cyber-physical situational awareness</Eyebrow>
          </div>

          <h1 className="mt-7 font-display leading-[0.96] tracking-tight">
            <span
              className="animate-rise_sm block text-[40px] font-bold text-ink sm:text-[48px] lg:text-[54px]"
              style={{ animationDelay: "60ms" }}
            >
              Security systems
            </span>
            <span
              className="animate-rise_sm -mt-1 block pl-[8%] text-[28px] font-medium text-ink-muted sm:text-[34px] lg:text-[38px]"
              style={{ animationDelay: "120ms" }}
            >
              see events.
            </span>
            <span className="animate-rise_sm mt-3 block text-[56px] font-bold text-teal sm:text-[68px] lg:text-[78px]" style={{ animationDelay: "200ms" }}>
              SENTRIX
            </span>
            <span
              className="animate-rise_sm -mt-2 block pl-[14%] text-[28px] font-medium text-ink sm:text-[34px] lg:text-[38px]"
              style={{ animationDelay: "260ms" }}
            >
              sees relationships.
            </span>
          </h1>

          <div className="animate-rise_sm mt-8" style={{ animationDelay: "340ms" }}>
            <p className="max-w-[42ch] text-[15px] leading-relaxed text-ink-muted">
              SENTRIX correlates physical, endpoint and network signals into a single explainable incident, in real
              time.
            </p>
            <p className="mt-1.5 text-[13px] text-ink-faint">Deterministic fusion. Operator-auditable reasoning.</p>
          </div>

          <div className="animate-rise_sm mt-9 flex flex-wrap items-center gap-5" style={{ animationDelay: "400ms" }}>
            <IconTextLink to="/mission-control" icon={<ArrowIcon />} emphasis>
              Enter Mission Control
            </IconTextLink>
            <span className="hidden h-9 w-px bg-line sm:block" />
            <IconTextLink href="#live" icon={<PlayIcon />}>
              Watch how it works
            </IconTextLink>
          </div>
        </div>

          <div className="relative flex w-full flex-1 flex-col items-center justify-center lg:justify-end">
          <LiveTransfersWidget />
          <div className="hidden w-full max-w-[760px] lg:block">
            <PhoneNetworkField />
          </div>
          <div className="w-full max-w-[420px] overflow-x-auto lg:hidden">
            <SignalDiagram />
          </div>
          <p className="mt-3 hidden text-center font-mono text-[10px] tracking-[0.06em] text-ink-faint lg:block">
            Illustrative demo scenario — device IPs shown for storytelling only
          </p>
        </div>
      </div>
    </div>
  );
}
