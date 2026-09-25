import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";

const DOMAINS = [
  {
    key: "vision",
    label: "Vision",
    color: "#4779D8",
    desc: "Physical presence and zone activity from camera adapters.",
    examples: ["person_in_restricted_zone", "unauthorized_entry"],
  },
  {
    key: "endpoint",
    label: "Endpoint",
    color: "#805EC7",
    desc: "Host-level activity from endpoint agents.",
    examples: ["usb_device_attached", "unexpected_process"],
  },
  {
    key: "network",
    label: "Network",
    color: "#2A9698",
    desc: "Traffic and flow anomalies from network sensors.",
    examples: ["outbound_data_anomaly", "unusual_destination"],
  },
];

export function SignalDomains() {
  return (
    <Section id="system">
      <h2 className="max-w-[18ch] text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
        Three domains. One protected asset.
      </h2>
      <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-ink-muted">
        Every adapter, regardless of domain, speaks the same event schema — a source, an asset, an optional
        zone, a severity and a confidence. Fusion doesn't need to understand cameras or network flows; it only
        needs events shaped consistently.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {DOMAINS.map((d, i) => (
          <Reveal key={d.key} delayMs={i * 100}>
            <div className="rounded-sm border border-line bg-base-700 p-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: d.color }}>
                  {d.label}
                </span>
              </div>
              <p className="mt-2.5 text-[13px] leading-snug text-ink-muted">{d.desc}</p>
              <div className="mt-3 flex flex-col gap-1 border-t border-line-soft pt-3">
                {d.examples.map((e) => (
                  <span key={e} className="font-mono text-[11px] text-ink-faint">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
