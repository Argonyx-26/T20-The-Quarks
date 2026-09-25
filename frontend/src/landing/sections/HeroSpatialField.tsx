import { useEffect, useState } from "react";
import { ContextCore } from "../shared/ContextCore";
import { VisionIcon, EndpointIcon, NetworkIcon } from "../shared/domainVisuals";

// Shared coordinate space every path + label is authored against — both the
// SVG (viewBox) and the absolutely-positioned label divs (as % of this box)
// reference the same numbers, so they stay aligned as the stage scales.
const BOX = { w: 720, h: 620 };
const CORE = { x: 468, y: 316 };

const SOURCES = [
  {
    key: "vision",
    label: "VISION",
    color: "#4779D8",
    icon: <VisionIcon />,
    anchor: { x: 64, y: 108 },
    depth: "near" as const,
    event: "restricted_zone_presence",
    delay: 900,
  },
  {
    key: "endpoint",
    label: "ENDPOINT",
    color: "#805EC7",
    icon: <EndpointIcon />,
    anchor: { x: 30, y: 328 },
    depth: "mid" as const,
    event: "usb_attached",
    delay: 1300,
  },
  {
    key: "network",
    label: "NETWORK",
    color: "#2A9698",
    icon: <NetworkIcon />,
    anchor: { x: 78, y: 512 },
    depth: "far" as const,
    event: "outbound_anomaly",
    delay: 1700,
  },
];

const INCIDENT_ANCHOR = { x: 664, y: 452 };

function pct(v: number, total: number) {
  return `${(v / total) * 100}%`;
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const c = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
}

const DEPTH_STYLE: Record<"near" | "mid" | "far", { scale: number; opacity: number }> = {
  near: { scale: 1, opacity: 1 },
  mid: { scale: 0.92, opacity: 0.85 },
  far: { scale: 0.84, opacity: 0.68 },
};

export function HeroSpatialField() {
  const [phase, setPhase] = useState(0);
  const [coreState, setCoreState] = useState<"idle" | "aligning" | "locked">("idle");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase(4);
      setCoreState("locked");
      return;
    }
    const timers = [
      setTimeout(() => setPhase(1), 900),
      setTimeout(() => setPhase(2), 1700),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setCoreState("aligning"), 2600),
      setTimeout(() => setCoreState("locked"), 3200),
      setTimeout(() => setPhase(4), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative mx-auto aspect-[720/620] w-full max-w-[720px]" aria-hidden="true">
      {/* faint architectural background: perspective grid + soft directional light */}
      <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.5 }}>
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 55% at 68% 48%, rgba(255,255,255,0.9), transparent 70%)",
          }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(BOX.w / 6) * i}
              y1="0"
              x2={(BOX.w / 6) * i}
              y2={BOX.h}
              stroke="rgba(21,26,31,0.05)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={(BOX.h / 5) * i}
              x2={BOX.w}
              y2={(BOX.h / 5) * i}
              stroke="rgba(21,26,31,0.05)"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* signal paths */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="xMidYMid meet">
        {SOURCES.map((s, i) => {
          const active = phase > i;
          const d = bezier(s.anchor.x + 46, s.anchor.y, CORE.x - 60, CORE.y + (i - 1) * 34);
          const pathId = `hero-path-${s.key}`;
          return (
            <g key={s.key}>
              <path
                id={pathId}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={1.4}
                strokeOpacity={active ? 0.55 : 0}
                pathLength={1}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: active ? 0 : 1,
                  transition: "stroke-dashoffset 900ms ease-out, stroke-opacity 500ms ease-out",
                }}
              />
              {active && (
                <circle r="2.4" fill={s.color} opacity="0.85">
                  <animateMotion begin="0s" dur="2.6s" repeatCount="indefinite">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}

        {phase >= 3 && (
          <g>
            <path
              id="hero-path-incident"
              d={bezier(CORE.x + 60, CORE.y, INCIDENT_ANCHOR.x - 40, INCIDENT_ANCHOR.y)}
              fill="none"
              stroke="#CB514F"
              strokeWidth="1.6"
              strokeOpacity="0.6"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 0, animation: "draw-path 0.6s ease-out both" }}
            />
            <circle r="2.4" fill="#CB514F" opacity="0.9">
              <animateMotion begin="0.6s" dur="1.8s" repeatCount="indefinite">
                <mpath href="#hero-path-incident" />
              </animateMotion>
            </circle>
          </g>
        )}
      </svg>

      {/* the core itself */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: pct(CORE.x, BOX.w), top: pct(CORE.y, BOX.h) }}
      >
        <ContextCore size={300} state={coreState} />
      </div>

      {/* spatial signal labels */}
      {SOURCES.map((s, i) => {
        const active = phase > i;
        const d = DEPTH_STYLE[s.depth];
        return (
          <div
            key={s.key}
            className="absolute flex items-center gap-2.5 transition-all duration-700 ease-out"
            style={{
              left: pct(s.anchor.x, BOX.w),
              top: pct(s.anchor.y, BOX.h),
              transform: `translateY(-50%) scale(${d.scale})`,
              transformOrigin: "left center",
              opacity: active ? d.opacity : 0,
              filter: s.depth === "far" ? "blur(0.3px)" : "none",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border bg-base-500/80 backdrop-blur-sm"
              style={{ borderColor: `${s.color}40`, color: s.color, boxShadow: "0 8px 20px -10px rgba(15,22,28,0.3)" }}
            >
              {s.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-mono text-[10.5px] tracking-[0.08em]" style={{ color: s.color }}>
                  {s.label}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint">{s.event}</p>
            </div>
          </div>
        );
      })}

      {/* incident annotation */}
      <div
        className="absolute transition-all duration-700 ease-out"
        style={{
          left: pct(INCIDENT_ANCHOR.x, BOX.w),
          top: pct(INCIDENT_ANCHOR.y, BOX.h),
          transform: "translateY(-50%)",
          opacity: phase >= 4 ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-status-critical" />
          <span className="font-mono text-[10.5px] tracking-[0.1em] text-status-critical">INC-0001</span>
        </div>
        <p className="mt-1 max-w-[180px] text-[12px] font-medium leading-snug text-ink">
          Suspicious multi-signal activity
        </p>
        <p className="mt-1 font-mono text-[10px] text-ink-faint">LAB-01 · 98.6%</p>
      </div>
    </div>
  );
}
