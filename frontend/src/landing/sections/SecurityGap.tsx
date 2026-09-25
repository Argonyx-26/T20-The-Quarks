import { useState } from "react";
import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";
import { EventEvidenceCard } from "../shared/EventEvidenceCard";
import { VisionIcon, EndpointIcon, NetworkIcon, VisionVisual, EndpointVisual, NetworkVisual } from "../shared/domainVisuals";

type Key = "vision" | "endpoint" | "network";

const EVENTS: {
  key: Key;
  index: string;
  domainCaption: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  visual: React.ReactNode;
  timestamp: string;
  eventLines: [string, string];
  meta: { label: string; value: string }[];
}[] = [
  {
    key: "vision",
    index: "01",
    domainCaption: "PHYSICAL SPACE",
    label: "VISION",
    color: "#4779D8",
    icon: <VisionIcon />,
    visual: <VisionVisual color="#4779D8" />,
    timestamp: "00:00.0",
    eventLines: ["Person detected", "in restricted zone"],
    meta: [
      { label: "ZONE", value: "RESTRICTED-LAB" },
      { label: "CONFIDENCE", value: "82%" },
    ],
  },
  {
    key: "endpoint",
    index: "02",
    domainCaption: "DEVICE ACTIVITY",
    label: "ENDPOINT",
    color: "#805EC7",
    icon: <EndpointIcon />,
    visual: <EndpointVisual color="#805EC7" />,
    timestamp: "00:05.0",
    eventLines: ["USB device", "attached"],
    meta: [
      { label: "ASSET", value: "LAB-01" },
      { label: "DEVICE", value: "mass_storage" },
      { label: "PROCESS", value: "explorer.exe" },
    ],
  },
  {
    key: "network",
    index: "03",
    domainCaption: "NETWORK BEHAVIOR",
    label: "NETWORK",
    color: "#2A9698",
    icon: <NetworkIcon />,
    visual: <NetworkVisual color="#2A9698" />,
    timestamp: "00:11.0",
    eventLines: ["Outbound traffic", "anomaly detected"],
    meta: [
      { label: "DESTINATION", value: "203.0.113.44" },
      { label: "BYTES OUT", value: "84.2 MB" },
      { label: "FLOW ID", value: "fl-9911" },
    ],
  },
];

function Crosshair() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0" aria-hidden="true">
      <path d="M7 0v5.2M7 8.8V14M0 7h5.2M8.8 7H14" stroke="rgba(22,30,38,0.28)" strokeWidth="1" />
    </svg>
  );
}

export function SecurityGap() {
  const [hovered, setHovered] = useState<Key | null>(null);

  return (
    <Section id="problem" border={false} className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-6 w-px bg-line-strong/30 sm:left-10 lg:left-12" aria-hidden="true" />

      <div className="grid gap-14 pl-6 sm:pl-10 lg:grid-cols-[32%_1fr] lg:gap-10 lg:pl-12">
        <Reveal>
          <div className="flex items-start gap-3">
            <span className="font-mono text-[11px] text-ink-faint">01</span>
            <div>
              <span className="text-[11px] font-medium tracking-[0.14em] text-ink-faint">THE PROBLEM</span>
              <h2 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[40px] lg:text-[44px]">
                <span className="block text-ink">The problem isn't</span>
                <span className="block text-ink">missing alerts.</span>
                <span className="block text-ink-muted">It's disconnected</span>
                <span className="block text-ink-muted">ones.</span>
              </h2>
              <p className="mt-6 max-w-[38ch] text-[13.5px] leading-relaxed text-ink-muted">
                Each system reports independently, in isolation, with no shared sense of place or asset. Three
                true, correctly-detected signals sit in three different consoles, and nobody asks the one
                question that matters: do these belong to the same story?
              </p>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col gap-4 overflow-x-auto sm:flex-row sm:gap-5">
          {EVENTS.map((e, i) => (
            <Reveal key={e.key} delayMs={150 + i * 150}>
              <EventEvidenceCard
                index={e.index}
                domainCaption={e.domainCaption}
                label={e.label}
                color={e.color}
                icon={e.icon}
                visual={e.visual}
                timestamp={e.timestamp}
                eventLines={e.eventLines}
                meta={e.meta}
                dimmed={hovered !== null && hovered !== e.key}
                onHover={(h) => setHovered(h ? e.key : null)}
              />
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal delayMs={650}>
        <div className="mt-14 flex items-center gap-4 pl-6 sm:pl-10 lg:pl-12">
          <Crosshair />
          <span className="h-px w-8 bg-line-strong/50 sm:w-12" />
          <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-muted">
            Three true events. Three separate systems. <span className="text-amber">No shared context.</span>
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
