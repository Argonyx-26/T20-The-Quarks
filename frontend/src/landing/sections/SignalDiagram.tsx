import { useCallback, useLayoutEffect, useRef, useState } from "react";

type SourceKey = "vision" | "endpoint" | "network";

const SOURCES: { key: SourceKey; label: string; color: string; lines: [string, string]; time: string }[] = [
  { key: "vision", label: "VISION", color: "#4779D8", lines: ["Person detected", "in restricted zone"], time: "T + 0.0s" },
  { key: "endpoint", label: "ENDPOINT", color: "#805EC7", lines: ["USB device", "attached"], time: "T + 5.0s" },
  { key: "network", label: "NETWORK", color: "#2A9698", lines: ["Outbound anomaly", "detected"], time: "T + 11.0s" },
];

const DELAYS: Record<SourceKey, number> = { vision: 300, endpoint: 700, network: 1100 };
// Where each source's connector lands on Fusion's left edge, as a fraction of its height.
const FUSION_INPUT_FRACTION: Record<SourceKey, number> = { vision: 0.24, endpoint: 0.5, network: 0.76 };

interface Point {
  x: number;
  y: number;
}
interface ConnPath {
  d: string;
  start: Point;
}
interface Geometry {
  width: number;
  height: number;
  sources: Record<SourceKey, ConnPath>;
  output: ConnPath;
}

function bezier(start: Point, end: Point): string {
  const dx = end.x - start.x;
  const c = dx * 0.45;
  return `M ${start.x} ${start.y} C ${start.x + c} ${start.y}, ${end.x - c} ${end.y}, ${end.x} ${end.y}`;
}

function Thumbnail({ source, color }: { source: SourceKey; color: string }) {
  if (source === "vision") {
    return (
      <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
        <g stroke={color} strokeOpacity="0.75" strokeWidth="1.3" fill="none">
          <circle cx="28" cy="19" r="5" />
          <path d="M 18 38 C 18 28, 38 28, 38 38" />
        </g>
      </svg>
    );
  }
  if (source === "endpoint") {
    return (
      <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
        <g stroke={color} strokeOpacity="0.75" strokeWidth="1.3" fill="none">
          <rect x="17" y="14" width="22" height="12" rx="2" />
          <path d="M 23 26 L 23 33 M 33 26 L 33 33 M 19 33 L 37 33" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
      <g stroke={color} strokeOpacity="0.75" strokeWidth="1.2" fill="none">
        <circle cx="18" cy="17" r="2.3" fill={color} fillOpacity="0.8" stroke="none" />
        <circle cx="38" cy="21" r="2.3" fill={color} fillOpacity="0.8" stroke="none" />
        <circle cx="23" cy="37" r="2.3" fill={color} fillOpacity="0.8" stroke="none" />
        <path d="M 18 17 L 38 21 M 18 17 L 23 37 M 38 21 L 23 37" />
      </g>
    </svg>
  );
}

export function SignalDiagram() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<Record<SourceKey, HTMLDivElement | null>>({ vision: null, endpoint: null, network: null });
  const fusionRef = useRef<HTMLDivElement>(null);
  const incidentRef = useRef<HTMLDivElement>(null);

  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [hovered, setHovered] = useState<SourceKey | "fusion" | "incident" | null>(null);

  const recompute = useCallback(() => {
    const stage = stageRef.current;
    const fusionEl = fusionRef.current;
    const incidentEl = incidentRef.current;
    if (!stage || !fusionEl || !incidentEl) return;

    const stageRect = stage.getBoundingClientRect();
    const local = (r: DOMRect) => ({
      left: r.left - stageRect.left,
      right: r.right - stageRect.left,
      top: r.top - stageRect.top,
      bottom: r.bottom - stageRect.top,
    });

    const fL = local(fusionEl.getBoundingClientRect());
    const iL = local(incidentEl.getBoundingClientRect());
    const fusionHeight = fL.bottom - fL.top;
    const fusionCenterY = fL.top + fusionHeight / 2;

    const sources = {} as Record<SourceKey, ConnPath>;
    for (const s of SOURCES) {
      const el = sourceRefs.current[s.key];
      if (!el) return;
      const r = local(el.getBoundingClientRect());
      const start: Point = { x: r.right, y: r.top + (r.bottom - r.top) / 2 };
      const end: Point = { x: fL.left, y: fL.top + fusionHeight * FUSION_INPUT_FRACTION[s.key] };
      sources[s.key] = { d: bezier(start, end), start };
    }

    const outputStart: Point = { x: fL.right, y: fusionCenterY };
    const outputEnd: Point = { x: iL.left, y: iL.top + (iL.bottom - iL.top) / 2 };

    setGeometry({
      width: stageRect.width,
      height: stageRect.height,
      sources,
      output: { d: bezier(outputStart, outputEnd), start: outputStart },
    });
  }, []);

  useLayoutEffect(() => {
    recompute();
    const stage = stageRef.current;
    if (!stage) return;

    const ro = new ResizeObserver(() => recompute());
    ro.observe(stage);
    window.addEventListener("resize", recompute);

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) recompute();
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  const dim = (key: SourceKey) => hovered !== null && hovered !== "incident" && hovered !== key && hovered !== "fusion";
  const pathActive = (key: SourceKey) => hovered === key || hovered === "incident" || hovered === "fusion" || hovered === null;

  return (
    <div ref={stageRef} className="relative flex w-full min-w-[520px] max-w-[720px] items-center gap-10">
      <div className="pointer-events-none absolute inset-x-0 top-[-28px] flex justify-between" style={{ zIndex: 0 }} aria-hidden="true">
        {["T + 0s", "+5s", "+10s", "+15s"].map((label) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9.5px] text-ink-faint">{label}</span>
            <span className="h-2 w-px bg-line-strong" />
          </div>
        ))}
      </div>

      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
        viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined}
        style={{ zIndex: 0, overflow: "visible" }}
        aria-hidden="true"
      >
        {geometry &&
          SOURCES.map((s) => {
            const p = geometry.sources[s.key];
            const pathId = `signal-path-${s.key}`;
            return (
              <g key={s.key}>
                <path
                  id={pathId}
                  d={p.d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hovered === s.key ? 2 : 1.4}
                  strokeOpacity={dim(s.key) ? 0.15 : pathActive(s.key) ? 0.6 : 0.35}
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: `draw-path 0.7s ease-out ${DELAYS[s.key]}ms both`,
                    transition: "stroke-opacity 220ms ease, stroke-width 220ms ease",
                  }}
                />
                <circle r="2.2" fill={s.color} opacity={dim(s.key) ? 0.2 : 0.9} cx={p.start.x} cy={p.start.y}>
                  <animateMotion begin={`${DELAYS[s.key] + 750}ms`} dur="2.4s" repeatCount="indefinite">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}

        {geometry && (
          <g>
            <path
              id="signal-path-output"
              d={geometry.output.d}
              fill="none"
              stroke="#CB514F"
              strokeWidth="1.6"
              strokeOpacity={hovered === "incident" || hovered === "fusion" || hovered === null ? 0.55 : 0.2}
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "draw-path 0.5s ease-out 2300ms both", transition: "stroke-opacity 220ms ease" }}
            />
            <circle r="2" fill="#CB514F" opacity="0.85" cx={geometry.output.start.x} cy={geometry.output.start.y}>
              <animateMotion begin="2800ms" dur="1.8s" repeatCount="indefinite">
                <mpath href="#signal-path-output" />
              </animateMotion>
            </circle>
          </g>
        )}
      </svg>

      <div className="relative z-10 flex flex-1 flex-col justify-between gap-10 py-2">
        {SOURCES.map((s) => (
          <div
            key={s.key}
            ref={(el) => {
              sourceRefs.current[s.key] = el;
            }}
            className="flex flex-col gap-2 transition-opacity duration-normal"
            style={{ opacity: dim(s.key) ? 0.4 : 1, animation: `rise-in 0.5s ease-out ${DELAYS[s.key]}ms both` }}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color: s.color }}>
                {s.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[4px] border" style={{ borderColor: `${s.color}4D`, backgroundColor: "#F4F6F7" }}>
                <Thumbnail source={s.key} color={s.color} />
              </div>
              <div>
                <p className="text-[12.5px] leading-snug text-ink">
                  {s.lines[0]}
                  <br />
                  {s.lines[1]}
                </p>
                <span className="font-mono text-[10px] text-ink-faint">{s.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        ref={fusionRef}
        className="relative z-10 flex w-[110px] shrink-0 flex-col items-center gap-1.5 rounded-[4px] border border-line-strong bg-base-600 px-3 py-4"
        style={{ animation: "rise-in 0.5s ease-out 1900ms both", cursor: "default" }}
        onMouseEnter={() => setHovered("fusion")}
        onMouseLeave={() => setHovered(null)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" style={{ animation: "spin-slow 5s linear infinite" }}>
          <circle cx="12" cy="12" r="8" fill="none" stroke="#151A20" strokeOpacity="0.5" strokeWidth="1.6" strokeDasharray="9 5" />
        </svg>
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-ink">FUSION</span>
        <span className="text-center text-[9.5px] leading-tight text-ink-faint">
          context
          <br />
          correlation
        </span>

        {hovered === "fusion" && (
          <div
            className="pointer-events-none absolute -top-16 left-1/2 w-max -translate-x-1/2 rounded-sm border border-line-strong bg-base-500 px-3 py-2 text-[11px] leading-relaxed text-ink-muted shadow-[0_8px_24px_rgba(20,30,40,0.1)]"
            role="tooltip"
          >
            <div className="font-mono text-[10px] text-ink">3 sources · 11.0s span</div>
            <div className="text-ink-faint">context match confirmed</div>
          </div>
        )}
      </div>

      <div
        ref={incidentRef}
        className="relative z-10 flex w-[154px] shrink-0 flex-col gap-3 rounded-[4px] border-y border-r py-4 pl-4 pr-3"
        style={{ borderColor: "rgba(203,81,79,0.3)", borderLeft: "2px solid rgba(203,81,79,0.7)", backgroundColor: "#F7ECEB", animation: "rise-in 0.5s ease-out 2800ms both", cursor: "default" }}
        onMouseEnter={() => setHovered("incident")}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-status-critical" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-status-critical">INCIDENT</span>
        </div>
        <p className="text-[14px] font-medium leading-snug text-ink">Suspicious multi-signal activity</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-[5px] border border-line-strong px-2.5 py-1 font-mono text-[9.5px] text-ink">LAB-01</span>
          <span className="rounded-[5px] border border-status-critical/40 bg-status-critical/10 px-2.5 py-1 font-mono text-[9.5px] text-status-critical">RESTRICTED</span>
        </div>
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="text-ink-muted">Confidence</span>
          <span className="font-mono font-medium text-status-critical">98.6%</span>
        </div>
        <div className="h-0.5 w-full rounded-full bg-status-critical/15">
          <div className="h-full w-[98.6%] rounded-full bg-status-critical/70" />
        </div>
      </div>
    </div>
  );
}
