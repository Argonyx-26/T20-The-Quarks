import { Reveal } from "../shared/Reveal";
import { PrimaryButton, Section } from "../shared/ui";

const EVENTS = [
  { t: "00:00.0", source: "vision", color: "#4779D8", type: "person_in_restricted_zone", asset: "LAB-01", sev: 55, conf: 82 },
  { t: "00:05.0", source: "endpoint", color: "#805EC7", type: "usb_device_attached", asset: "LAB-01", sev: 60, conf: 75 },
  { t: "00:11.0", source: "network", color: "#2A9698", type: "outbound_data_anomaly", asset: "LAB-01", sev: 70, conf: 68 },
];

const TIMELINE = [
  { t: "00:00.0", label: "Person presence detected", color: "#4779D8" },
  { t: "00:05.0", label: "USB device attached", color: "#805EC7" },
  { t: "00:11.0", label: "Outbound traffic deviation", color: "#2A9698" },
  { t: "00:11.0", label: "INC-0001 created", color: "#CB514F" },
];

export function ProductPreview() {
  return (
    <Section id="live">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="max-w-[20ch] text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
            This is what it looks like in the product.
          </h2>
          <p className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-muted">
            The same <code className="font-mono text-[12.5px] text-ink">positive_correlation</code> fixture, rendered in
            Mission Control — event stream on the left, resolved incident on the right.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <div className="rounded-sm border border-line bg-base-700">
            <div className="border-b border-line px-4 py-2.5 text-[11px] font-semibold tracking-wide text-ink-muted">
              Event stream
            </div>
            <div className="flex flex-col divide-y divide-line-soft">
              {EVENTS.map((e) => (
                <div key={e.type} className="flex items-center gap-3 px-4 py-3 font-mono text-[11.5px]">
                  <span className="text-ink-faint">{e.t}</span>
                  <span style={{ color: e.color }}>{e.source}</span>
                  <span className="flex-1 truncate text-ink">{e.type}</span>
                  <span className="text-ink-faint">{e.asset}</span>
                  <span className="text-ink-muted">{e.sev}</span>
                  <span className="text-ink-faint">{e.conf}%</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={180}>
          <div className="rounded-sm border border-status-critical/30 bg-base-700">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-[11px] font-semibold tracking-wide text-ink-muted">Incident INC-0001</span>
              <span className="rounded-sm border border-status-critical/50 bg-status-critical/10 px-1.5 py-0.5 font-mono text-[10px] text-status-critical">
                OPEN
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-4 text-[12px]">
                <span className="text-ink-muted">
                  Severity <span className="font-mono font-medium text-ink">70</span>
                </span>
                <span className="text-ink-muted">
                  Confidence <span className="font-mono font-medium text-ink">98.6%</span>
                </span>
                <span className="text-ink-muted">
                  Asset <span className="font-mono font-medium text-ink">LAB-01</span>
                </span>
              </div>
              <ol className="relative mt-4 border-l border-line pl-4">
                {TIMELINE.map((t, i) => (
                  <li key={i} className="mb-2.5 last:mb-0">
                    <span
                      className="absolute -left-[4.5px] mt-1 h-2 w-2 rounded-full ring-2 ring-base-700"
                      style={{ backgroundColor: t.color }}
                    />
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10.5px] text-ink-faint">{t.t}</span>
                      <span className="text-[12px] text-ink-muted">{t.label}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 border-t border-line-soft pt-3 text-[12px] leading-snug text-ink-muted">
                Recommended action: <span className="text-ink">investigate promptly — review evidence and confirm asset status.</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mt-8">
        <PrimaryButton to="/mission-control">Open Mission Control</PrimaryButton>
      </div>
    </Section>
  );
}
