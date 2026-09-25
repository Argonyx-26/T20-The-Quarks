import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";
import { VisionIcon, EndpointIcon, NetworkIcon } from "../shared/domainVisuals";

const SOURCES = [
  { key: "vision", label: "VISION", color: "#4779BD", icon: <VisionIcon /> },
  { key: "endpoint", label: "ENDPOINT", color: "#785EAB", icon: <EndpointIcon /> },
  { key: "network", label: "NETWORK", color: "#138983", icon: <NetworkIcon /> },
];

const SCHEMA_FIELDS = [
  { field: "timestamp", example: "ISO-8601" },
  { field: "source", example: "vision | endpoint | network" },
  { field: "event_type", example: "usb_device_attached" },
  { field: "asset_id", example: "LAB-01" },
  { field: "zone_id", example: "RESTRICTED-LAB | null" },
  { field: "severity", example: "0–100" },
  { field: "confidence", example: "0.0–1.0" },
];

export function SignalDomains() {
  return (
    <Section id="system">
      <h2 className="max-w-[20ch] text-[32px] font-display font-bold leading-tight text-ink sm:text-[40px] lg:text-[44px]">
        One schema. Three domains.
      </h2>
      <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-ink-muted">
        Every adapter speaks the same normalized event, regardless of domain. Fusion doesn't need to understand
        cameras or network flows — it only needs events shaped consistently.
      </p>

      <div className="mt-16 flex flex-col lg:flex-row lg:items-stretch lg:gap-0">
        {/* sources */}
        <div className="flex shrink-0 flex-col gap-4 lg:justify-center lg:gap-5 lg:pr-8">
          {SOURCES.map((s, i) => (
            <Reveal key={s.key} delayMs={i * 100} className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border bg-base-500"
                style={{ borderColor: `${s.color}45`, color: s.color }}
              >
                {s.icon}
              </div>
              <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color: s.color }}>
                {s.label}
              </span>
            </Reveal>
          ))}
        </div>

        {/* connector */}
        <div className="relative my-6 h-8 lg:my-0 lg:h-auto lg:w-16 lg:shrink-0">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 64 200">
            <path d="M0 30 C 32 30, 32 100, 64 100" stroke="#4779BD" strokeOpacity="0.4" strokeWidth="1.4" fill="none" />
            <path d="M0 100 L 64 100" stroke="#785EAB" strokeOpacity="0.4" strokeWidth="1.4" fill="none" />
            <path d="M0 170 C 32 170, 32 100, 64 100" stroke="#138983" strokeOpacity="0.4" strokeWidth="1.4" fill="none" />
          </svg>
        </div>

        {/* normalized event schema */}
        <Reveal delayMs={250} className="flex-1">
          <div className="h-full border border-line bg-base-700">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[11px] font-semibold tracking-wide text-ink-muted">NORMALIZED EVENT</span>
              <span className="font-mono text-[10px] text-ink-faint">event schema</span>
            </div>
            <div className="flex flex-col divide-y divide-line-soft">
              {SCHEMA_FIELDS.map((f) => (
                <div key={f.field} className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-mono text-[12px] text-ink">{f.field}</span>
                  <span className="font-mono text-[11px] text-ink-faint">{f.example}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* connector 2 */}
        <div className="relative my-6 h-8 lg:my-0 lg:h-auto lg:w-16 lg:shrink-0">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 64 200">
            <path d="M0 100 L 64 100" stroke="#0F7A75" strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
          </svg>
        </div>

        {/* fusion + incident */}
        <div className="flex shrink-0 flex-row gap-4 lg:flex-col lg:justify-center lg:gap-4">
          <Reveal delayMs={350}>
            <div className="flex w-[168px] flex-col items-center gap-1.5 border border-line-strong bg-base-600 px-4 py-4 text-center">
              <span className="font-mono text-[11px] tracking-[0.08em] text-teal-dark">FUSION ENGINE</span>
              <span className="text-[10.5px] text-ink-faint">time · asset · zone · diversity · confidence</span>
            </div>
          </Reveal>
          <Reveal delayMs={450}>
            <div
              className="flex w-[168px] flex-col items-center gap-1.5 border px-4 py-4 text-center"
              style={{ borderColor: "rgba(201,95,89,0.35)", backgroundColor: "rgba(201,95,89,0.06)" }}
            >
              <span className="font-mono text-[11px] tracking-[0.08em] text-status-critical">INCIDENT OBJECT</span>
              <span className="text-[10.5px] text-ink-faint">consumed by Mission Control</span>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
