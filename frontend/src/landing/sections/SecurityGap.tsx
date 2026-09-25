import { useState } from "react";
import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";
import { ProblemSignalField } from "./ProblemSignalField";

const LEGEND = [
  { term: "DEVICE", def: "Who generated the signal" },
  { term: "NETWORK IDENTITY", def: "Where it came from" },
  { term: "EVENT", def: "What changed" },
];

export function SecurityGap() {
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <Section id="problem" border={false} className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: "linear-gradient(rgba(18,55,54,0.045) 1px, transparent 1px)", backgroundSize: "100% 96px", opacity: 0.6 }}
      />

      {/* headline: two distinct editorial blocks, not one flowing sentence */}
      <Reveal>
        <div className="relative flex items-start gap-4">
          <span className="mt-3 font-mono text-[11px] text-ink-faint">01</span>
          <div className="grid gap-6 lg:grid-cols-[0.55fr_0.45fr] lg:items-end lg:gap-10">
            <div>
              <span className="text-[11px] font-medium tracking-[0.14em] text-ink-faint">THE PROBLEM</span>
              <h2 className="mt-3 text-[40px] font-display font-bold leading-[0.98] tracking-tight text-ink sm:text-[52px] lg:text-[64px]">
                The problem isn't
                <br />
                missing alerts.
              </h2>
            </div>
            <h2 className="text-[26px] font-display font-bold leading-[1.05] tracking-tight text-ink-muted sm:text-[32px] lg:text-[38px]">
              It's knowing which ones <span className="text-teal-dark">belong together.</span>
            </h2>
          </div>
        </div>
      </Reveal>

      {/* compact legend — corner, not competing with the scene */}
      <Reveal delayMs={150}>
        <div className="relative mt-8 flex justify-end">
          <button
            onClick={() => setLegendOpen((v) => !v)}
            className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-faint hover:text-teal-dark"
            aria-expanded={legendOpen}
          >
            <span className={`transition-transform ${legendOpen ? "rotate-90" : ""}`}>›</span>
            HOW TO READ THIS
          </button>
        </div>
        {legendOpen && (
          <div className="relative mt-2 flex flex-wrap justify-end gap-x-6 gap-y-1.5 border-t border-line-soft pt-3 text-right">
            {LEGEND.map((l) => (
              <div key={l.term} className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-teal-dark">{l.term}</span>
                <span className="text-[11px] text-ink-faint">{l.def}</span>
              </div>
            ))}
          </div>
        )}
      </Reveal>

      {/* the spatial scene */}
      <Reveal delayMs={200}>
        <div className="relative mt-8">
          <ProblemSignalField />
        </div>
      </Reveal>

      <p className="relative -mt-2 text-center font-mono text-[10px] text-ink-faint">
        Illustrative demo scenario — device IPs shown for storytelling only
      </p>

      {/* big statement */}
      <Reveal delayMs={350}>
        <div className="relative mt-24 text-center">
          <h3 className="text-[36px] font-display font-bold leading-[1.02] tracking-tight sm:text-[48px] lg:text-[56px]">
            <span className="text-ink">THREE SIGNALS. </span>
            <span className="text-ink-faint">THREE SYSTEMS. </span>
            <span className="text-teal-dark">NO SHARED CONTEXT.</span>
          </h3>
        </div>
      </Reveal>

      {/* final question — largest type on the page */}
      <Reveal delayMs={500}>
        <div className="relative mt-16 text-center">
          <h3 className="mx-auto max-w-[18ch] text-[42px] font-display font-bold uppercase leading-[0.98] tracking-tight text-ink sm:text-[60px] lg:text-[72px]">
            Do these events
            <br />
            belong to the same story?
          </h3>
        </div>
      </Reveal>
    </Section>
  );
}
