import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";

const PRINCIPLES = [
  {
    title: "Not another source of alerts.",
    body: "SIEM and EDR platforms go deep within their own domain. SENTRIX doesn't compete there — it sits across physical, endpoint and network signal to supply the cross-domain context none of them have on their own.",
  },
  {
    title: "Context where the incident happens.",
    body: "Sensor adapters produce standardized events locally and push them into the same ingestion pipeline whether they're live hardware or a recorded fixture — so a demo, a rehearsal and a live deployment all run through identical fusion logic.",
  },
  {
    title: "Rules decide. Nothing else does.",
    body: "Every incident comes from deterministic, inspectable logic: shared context, source diversity and confidence thresholds — plain arithmetic, not a model call. If a language model ever narrates an incident for an operator, it narrates a decision that was already made. It never makes one.",
  },
];

export function Principles() {
  return (
    <Section>
      <div className="flex flex-col divide-y divide-line-soft">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.title} delayMs={i * 100} className="grid gap-4 py-8 first:pt-0 last:pb-0 sm:grid-cols-[280px_1fr] sm:gap-10">
            <h3 className="text-[19px] font-semibold leading-snug text-ink">{p.title}</h3>
            <p className="max-w-[58ch] text-[14px] leading-relaxed text-ink-muted">{p.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
