import { useEffect, useState } from "react";
import { ContextCore } from "../shared/ContextCore";

const BOX = { w: 760, h: 600 };
const CORE = { x: 380, y: 300 };
const OUTPUT = { x: 610, y: 300 };

const SIGNALS = [
  { key: "vision", label: "VISION", human: "Restricted-zone presence detected", color: "#4779BD", anchor: { x: 90, y: 150 }, meta: "person_in_restricted_zone" },
  { key: "endpoint", label: "ENDPOINT", human: "USB device attached", color: "#785EAB", anchor: { x: 70, y: 320 }, meta: "usb_device_attached" },
  { key: "network", label: "NETWORK", human: "Unusual outbound activity", color: "#138983", anchor: { x: 110, y: 470 }, meta: "outbound_deviation" },
];

function pct(v: number, total: number) {
  return `${(v / total) * 100}%`;
}
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const c = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
}

/** `activeStep`: 0 = raw input signals (shown once, in full), 1-5 = the
 * TIME/DEVICE/NETWORK/SOURCES/CONFIDENCE criteria. `highestStep` is the
 * furthest step ever reached -- the Engine's own alignment is driven by
 * this (not activeStep) so it never "un-resolves" when a visitor steps
 * back to review an earlier criterion. */
export function ContextEngineScene({ activeStep, highestStep }: { activeStep: number; highestStep: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase(3);
      return;
    }
    const timers = [setTimeout(() => setPhase(1), 400), setTimeout(() => setPhase(3), 1200)];
    return () => timers.forEach(clearTimeout);
  }, []);

  const coreState = highestStep === 0 ? "idle" : highestStep < 5 ? "aligning" : "locked";
  const resolved = highestStep >= 5;
  const showInputs = activeStep === 0;

  return (
    <>
      <MobileEngineStack coreState={coreState} resolved={resolved} showInputs={showInputs} highestStep={highestStep} />
      <div className="relative mx-auto hidden w-full lg:block" style={{ aspectRatio: `${BOX.w}/${BOX.h}`, maxWidth: 820 }} aria-hidden="true">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 55% 55% at 50% 45%, rgba(255,255,255,0.85), transparent 70%)" }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none">
          {[0.15, 0.5, 0.85].map((f) => (
            <line key={f} x1={BOX.w * f} y1="0" x2={BOX.w * f} y2={BOX.h} stroke="rgba(13,124,118,0.05)" strokeWidth="1" />
          ))}
        </svg>
        {/* corner instrument brackets -- frames the scene as one apparatus */}
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none">
          {(() => {
            const m = 28; // margin from edge
            const len = 34; // bracket arm length
            const corners = [
              { x: m, y: m, dx: 1, dy: 1 },
              { x: BOX.w - m, y: m, dx: -1, dy: 1 },
              { x: m, y: BOX.h - m, dx: 1, dy: -1 },
              { x: BOX.w - m, y: BOX.h - m, dx: -1, dy: -1 },
            ];
            return corners.map((c, i) => (
              <path
                key={i}
                d={`M ${c.x + c.dx * len} ${c.y} L ${c.x} ${c.y} L ${c.x} ${c.y + c.dy * len}`}
                fill="none"
                stroke="rgba(18,55,54,0.16)"
                strokeWidth="1"
              />
            ));
          })()}
        </svg>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="xMidYMid meet">
        {SIGNALS.map((s, i) => {
          const active = phase >= 1;
          const d = bezier(s.anchor.x + 40, s.anchor.y, CORE.x - 70, CORE.y + (i - 1) * 30);
          const id = `engine-path-${s.key}`;
          return (
            <g key={s.key}>
              <path
                id={id}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={1.6}
                strokeOpacity={active ? (showInputs ? 0.55 : 0.25) : 0}
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: active ? 0 : 1, transition: `stroke-dashoffset 700ms ease-out ${i * 150}ms, stroke-opacity 500ms ease` }}
              />
              {active && (
                <circle r="2.6" fill={s.color} opacity={showInputs ? 0.85 : 0.4}>
                  <animateMotion begin={`${i * 0.2}s`} dur="2.4s" repeatCount="indefinite">
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}

        {phase >= 3 && highestStep >= 1 && (
          <g>
            <path
              id="engine-output"
              d={bezier(CORE.x + 70, CORE.y, OUTPUT.x - 30, OUTPUT.y)}
              fill="none"
              stroke={resolved ? "#C75D56" : "rgba(75,87,88,0.35)"}
              strokeWidth="1.8"
              strokeOpacity="0.7"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 0, transition: "stroke 500ms ease" }}
            />
            {resolved && (
              <circle r="2.8" fill="#C75D56">
                <animateMotion begin="0s" dur="1.6s" repeatCount="indefinite">
                  <mpath href="#engine-output" />
                </animateMotion>
              </circle>
            )}
          </g>
        )}
      </svg>

      {SIGNALS.map((s) => (
        <div
          key={s.key}
          className="absolute -translate-y-1/2 transition-opacity duration-500"
          style={{ left: pct(s.anchor.x, BOX.w), top: pct(s.anchor.y, BOX.h), opacity: phase >= 1 && showInputs ? 1 : 0 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-mono text-[10px] font-semibold tracking-[0.06em]" style={{ color: s.color }}>
              {s.label}
            </span>
          </div>
          <p className="mt-0.5 max-w-[140px] text-[11.5px] font-medium text-ink">{s.human}</p>
          <p className="hidden font-mono text-[9px] text-ink-faint sm:block">{s.meta}</p>
        </div>
      ))}

      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(CORE.x, BOX.w), top: pct(CORE.y, BOX.h) }}>
        <ContextCore size={320} state={coreState} interactive />
      </div>

      {/* output readout -- a small instrument module, not floating text */}
      <div
        className="absolute max-w-[135px] -translate-y-1/2 border-l-2 py-1.5 pl-3 text-left transition-all duration-500 sm:max-w-[155px]"
        style={{
          left: pct(OUTPUT.x, BOX.w),
          top: pct(OUTPUT.y, BOX.h),
          opacity: phase >= 3 && highestStep >= 1 ? 1 : 0,
          borderColor: resolved ? "#C75D56" : "rgba(18,55,54,0.18)",
        }}
      >
        {resolved ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-critical" />
              <span className="font-mono text-[10px] font-bold leading-tight tracking-[0.06em] text-status-critical">CONTEXT RESOLVED</span>
            </div>
            <p className="mt-1.5 font-mono text-[13px] font-bold leading-tight text-ink">INC-0001</p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">Suspicious multi-signal activity</p>
            <div className="mt-1.5 flex flex-col gap-0.5 font-mono text-[9.5px] text-ink-faint">
              <span>92% confidence</span>
              <span>3 signals</span>
            </div>
          </>
        ) : (
          <>
            <span className="font-mono text-[10px] font-bold leading-tight tracking-[0.06em] text-ink-faint">CONTEXT UNRESOLVED</span>
            <p className="mt-1 text-[11px] leading-snug text-ink-faint">Awaiting contextual alignment</p>
          </>
        )}
      </div>
    </div>
    </>
  );
}

/** Narrow-viewport fallback -- the desktop scene positions signal labels and
 * the output readout by percentage anchors inside a fixed-aspect box, which
 * only leaves room for the Core at real width. Below `lg` it collides, so
 * mobile gets an independent, non-absolute layout: a smaller centered Core
 * with the same three signals (or the same readout) stacked underneath. */
function MobileEngineStack({
  coreState,
  resolved,
  showInputs,
  highestStep,
}: {
  coreState: "idle" | "aligning" | "locked";
  resolved: boolean;
  showInputs: boolean;
  highestStep: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6 lg:hidden">
      <ContextCore size={168} state={coreState} interactive={false} />

      {showInputs ? (
        <div className="flex w-full max-w-[320px] flex-col gap-4">
          {SIGNALS.map((s) => (
            <div key={s.key} className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <div>
                <span className="font-mono text-[10px] font-semibold tracking-[0.06em]" style={{ color: s.color }}>
                  {s.label}
                </span>
                <p className="mt-0.5 text-[12.5px] font-medium text-ink">{s.human}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="w-full max-w-[280px] border-l-2 py-1.5 pl-3 text-left"
          style={{ borderColor: resolved ? "#C75D56" : "rgba(18,55,54,0.18)" }}
        >
          {resolved ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-critical" />
                <span className="font-mono text-[10px] font-bold leading-tight tracking-[0.06em] text-status-critical">CONTEXT RESOLVED</span>
              </div>
              <p className="mt-1.5 font-mono text-[13px] font-bold leading-tight text-ink">INC-0001</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">Suspicious multi-signal activity</p>
              <div className="mt-1.5 flex flex-col gap-0.5 font-mono text-[10px] text-ink-faint">
                <span>92% confidence</span>
                <span>3 signals</span>
              </div>
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] font-bold leading-tight tracking-[0.06em] text-ink-faint">CONTEXT UNRESOLVED</span>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">Awaiting contextual alignment</p>
              <p className="mt-1 font-mono text-[10px] text-ink-faint">{highestStep} / 5 criteria checked</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
