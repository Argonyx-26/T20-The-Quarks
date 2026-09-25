import { useState } from "react";
import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";
import { VisionIcon, EndpointIcon, NetworkIcon } from "../shared/domainVisuals";

type Key = "vision" | "endpoint" | "network";

const TRACKS: {
  key: Key;
  label: string;
  color: string;
  icon: React.ReactNode;
  timestamp: string;
  event: string;
  meta: string;
  position: number; // 0–1 along the shared time axis, drives marker placement
}[] = [
  {
    key: "vision",
    label: "VISION",
    color: "#4779D8",
    icon: <VisionIcon />,
    timestamp: "14:32:05",
    event: "person_in_restricted_zone",
    meta: "LAB-01 · RESTRICTED-LAB",
    position: 0.08,
  },
  {
    key: "endpoint",
    label: "ENDPOINT",
    color: "#805EC7",
    icon: <EndpointIcon />,
    timestamp: "14:32:08",
    event: "usb_device_attached",
    meta: "LAB-01",
    position: 0.42,
  },
  {
    key: "network",
    label: "NETWORK",
    color: "#2A9698",
    icon: <NetworkIcon />,
    timestamp: "14:32:13",
    event: "outbound_data_anomaly",
    meta: "203.0.113.44 · 84.2 MB",
    position: 0.86,
  },
];

export function SecurityGap() {
  const [hovered, setHovered] = useState<Key | null>(null);

  return (
    <Section id="problem" border={false} className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: "linear-gradient(rgba(21,26,31,0.04) 1px, transparent 1px)", backgroundSize: "100% 96px", opacity: 0.6 }}
      />

      <Reveal>
        <div className="relative flex items-start gap-4">
          <span className="mt-3 font-mono text-[11px] text-ink-faint">01</span>
          <div>
            <span className="text-[11px] font-medium tracking-[0.14em] text-ink-faint">THE PROBLEM</span>
            <h2 className="mt-4 text-[56px] font-semibold leading-[0.98] tracking-tight sm:text-[72px] lg:text-[84px]">
              <span className="block text-ink">The problem isn't</span>
              <span className="block text-ink">missing alerts.</span>
              <span className="mt-2 block pl-[6%] text-ink-muted">It's disconnected</span>
              <span className="block pl-[6%] text-ink-muted">ones.</span>
            </h2>
          </div>
        </div>
      </Reveal>

      <div className="relative mt-20 flex flex-col gap-3">
        {TRACKS.map((t, i) => {
          const dimmed = hovered !== null && hovered !== t.key;
          return (
            <Reveal key={t.key} delayMs={150 + i * 180}>
              <div
                className="group relative flex flex-col gap-3 py-5 transition-opacity duration-normal sm:flex-row sm:items-center sm:gap-4"
                style={{ opacity: dimmed ? 0.35 : 1 }}
                onMouseEnter={() => setHovered(t.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-3 sm:contents">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border bg-base-500"
                    style={{ borderColor: `${t.color}45`, color: t.color }}
                  >
                    {t.icon}
                  </div>

                  <div className="sm:w-[110px] sm:shrink-0">
                    <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color: t.color }}>
                      {t.label}
                    </span>
                    <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint">{t.timestamp}</p>
                  </div>
                </div>

                <div className="relative h-px w-full sm:flex-1" style={{ backgroundColor: `${t.color}25` }}>
                  <span
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full transition-transform duration-normal group-hover:scale-150"
                    style={{ left: `${t.position * 100}%`, backgroundColor: t.color }}
                  />
                </div>

                <div className="pl-[52px] text-left sm:w-[220px] sm:shrink-0 sm:pl-0 sm:text-right lg:w-[280px]">
                  <p className="font-mono text-[12.5px] text-ink">{t.event}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{t.meta}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delayMs={700}>
        <p className="relative mt-16 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-muted">
          Each system reports independently, in isolation, with no shared sense of place or asset. Three true,
          correctly-detected signals sit in three different consoles, and nobody asks the one question that
          matters.
        </p>
      </Reveal>

      <Reveal delayMs={900}>
        <div className="relative mt-14 border-t border-line-soft pt-10">
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-muted">
            Three true events. Three separate systems. <span className="text-amber">No shared context.</span>
          </p>
          <h3 className="mt-5 max-w-[16ch] text-[38px] font-semibold leading-[1.02] tracking-tight text-ink sm:text-[48px] lg:text-[56px]">
            Do these events belong to the same story?
          </h3>
        </div>
      </Reveal>
    </Section>
  );
}
