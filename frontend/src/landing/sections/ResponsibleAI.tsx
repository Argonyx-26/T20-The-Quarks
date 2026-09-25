import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";

const STAGES = [
  { label: "Events", detail: "Standardized signals from vision, endpoint, network" },
  { label: "Deterministic fusion", detail: "Time · asset · zone · source diversity · confidence — plain arithmetic" },
  { label: "Incident", detail: "Created only when independent sources corroborate" },
  { label: "Explanation (optional)", detail: "A model may narrate a decision already made — never make one" },
];

export function ResponsibleAI() {
  return (
    <Section id="responsible-ai">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h2 className="text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
            AI explains.
            <br />
            Rules decide.
          </h2>
          <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-muted">
            If a language model appears anywhere in SENTRIX, it summarizes an incident for an operator after
            deterministic fusion has already created it. It never evaluates whether events correlate, never sets
            severity, and never decides an incident exists.
          </p>
        </div>

        <Reveal className="flex flex-col">
          {STAGES.map((s, i) => (
            <div key={s.label} className="flex gap-4 border-t border-line-soft py-4 first:border-t-0 first:pt-0 last:pb-0">
              <span className="w-6 shrink-0 pt-0.5 font-mono text-[11px] text-ink-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p
                  className={`font-mono text-[12px] tracking-[0.06em] ${
                    i === STAGES.length - 1 ? "text-ink-faint" : "text-ink"
                  }`}
                >
                  {s.label.toUpperCase()}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{s.detail}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}
