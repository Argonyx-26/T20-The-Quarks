import { useEffect, useState } from "react";
import { ContextCore } from "../shared/ContextCore";

const BOX = { w: 720, h: 600 };
const WIFI = { x: 300, y: 80 };
const CORE = { x: 520, y: 280 };
const INCIDENT = { x: 500, y: 460 };

const PHONE_A = { x: 96, y: 300, label: "PHONE A", status: "KNOWN DEVICE", ip: "192.168.1.21", accent: "#1E8580" };
const PHONE_B = { x: 300, y: 380, label: "PHONE B", status: "NEW DEVICE", ip: "192.168.1.37", accent: "#B68132" };

function pct(v: number, total: number) {
  return `${(v / total) * 100}%`;
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const c = (y2 - y1) * 0.55;
  return `M ${x1} ${y1} C ${x1} ${y1 + c}, ${x2} ${y2 - c}, ${x2} ${y2}`;
}

function Phone({ x, y, accent, active }: { x: number; y: number; accent: string; active: boolean }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[16px] transition-opacity duration-700"
      style={{
        left: pct(x, BOX.w),
        top: pct(y, BOX.h),
        width: 76,
        height: 156,
        opacity: active ? 1 : 0.25,
        background: "linear-gradient(160deg, #F6F7F5 0%, #EEF1F0 100%)",
        border: `1.5px solid ${active ? accent : "rgba(20,50,48,0.3)"}`,
        boxShadow: active ? "0 20px 40px -18px rgba(15,22,28,0.4)" : "none",
      }}
    >
      <div className="absolute left-1/2 top-2.5 h-1 w-1 -translate-x-1/2 rounded-full bg-ink-faint/50" />
      <div className="absolute inset-[7px] top-[16px] bottom-[10px] rounded-[6px]" style={{ backgroundColor: active ? `${accent}14` : "rgba(20,50,48,0.05)" }} />
      <div className="absolute bottom-2 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-ink-faint/40" />
    </div>
  );
}

export function PhoneNetworkField() {
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
      setTimeout(() => setPhase(1), 500), // Phone A known/connected
      setTimeout(() => setPhase(2), 1300), // Phone B joins, new device
      setTimeout(() => setPhase(3), 2200), // network event
      setTimeout(() => setCoreState("aligning"), 2200),
      setTimeout(() => setCoreState("locked"), 2800),
      setTimeout(() => setPhase(4), 3000), // incident annotation
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative mx-auto aspect-[720/600] w-full max-w-[720px]" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.55 }}>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 55% 50% at 55% 30%, rgba(255,255,255,0.75), transparent 70%)" }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`v${i}`} x1={(BOX.w / 6) * i} y1="0" x2={(BOX.w / 6) * i} y2={BOX.h} stroke="rgba(20,50,48,0.07)" strokeWidth="1" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={(BOX.h / 5) * i} x2={BOX.w} y2={(BOX.h / 5) * i} stroke="rgba(20,50,48,0.07)" strokeWidth="1" />
          ))}
        </svg>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="xMidYMid meet">
        {[
          { from: PHONE_A, active: phase >= 1 },
          { from: PHONE_B, active: phase >= 2 },
        ].map((p, i) => {
          const d = bezier(p.from.x, p.from.y - 78, WIFI.x, WIFI.y + 26);
          const id = `phone-path-${i}`;
          return (
            <g key={i}>
              <path
                id={id}
                d={d}
                fill="none"
                stroke={p.from.accent}
                strokeWidth="1.4"
                strokeOpacity={p.active ? 0.55 : 0}
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: p.active ? 0 : 1, transition: "stroke-dashoffset 800ms ease-out, stroke-opacity 500ms ease-out" }}
              />
              {p.active && (
                <circle r="2.4" fill={p.from.accent} opacity="0.85">
                  <animateMotion begin="0s" dur="2.4s" repeatCount="indefinite">
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}

        {phase >= 3 && (
          <g>
            <path
              id="wifi-core-path"
              d={bezier(WIFI.x, WIFI.y + 30, CORE.x - 40, CORE.y - 40)}
              fill="none"
              stroke="#1F6662"
              strokeWidth="1.6"
              strokeOpacity="0.55"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 0, animation: "draw-path 0.6s ease-out both" }}
            />
            <circle r="2.4" fill="#1F6662" opacity="0.9">
              <animateMotion begin="0.6s" dur="2s" repeatCount="indefinite">
                <mpath href="#wifi-core-path" />
              </animateMotion>
            </circle>
          </g>
        )}

        {phase >= 4 && (
          <g>
            <path
              id="core-incident-path"
              d={bezier(CORE.x + 40, CORE.y + 40, INCIDENT.x - 20, INCIDENT.y - 30)}
              fill="none"
              stroke="#C75C55"
              strokeWidth="1.6"
              strokeOpacity="0.6"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 0, animation: "draw-path 0.5s ease-out both" }}
            />
          </g>
        )}
      </svg>

      {/* wifi / network node */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500"
        style={{ left: pct(WIFI.x, BOX.w), top: pct(WIFI.y, BOX.h), opacity: phase >= 1 ? 1 : 0.3 }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-teal/40 bg-base-500" style={{ boxShadow: "0 12px 28px -14px rgba(15,22,28,0.35)" }}>
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <path d="M1 6.5C6 1.5 16 1.5 21 6.5" stroke="#1F6662" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
            <path d="M5 10.5C8.5 7 13.5 7 17 10.5" stroke="#1F6662" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
            <circle cx="11" cy="14.5" r="1.8" fill="#1F6662" />
          </svg>
        </div>
        <p className="mt-1.5 text-center font-mono text-[10px] tracking-[0.08em] text-ink-muted">LOCAL NETWORK</p>
      </div>

      {/* phones */}
      <Phone x={PHONE_A.x} y={PHONE_A.y} accent={PHONE_A.accent} active={phase >= 1} />
      <Phone x={PHONE_B.x} y={PHONE_B.y} accent={PHONE_B.accent} active={phase >= 2} />

      <div
        className="absolute -translate-x-1/2 transition-opacity duration-500"
        style={{ left: pct(PHONE_A.x, BOX.w), top: pct(PHONE_A.y + 90, BOX.h), opacity: phase >= 1 ? 1 : 0 }}
      >
        <p className="text-center font-mono text-[10.5px] font-semibold tracking-[0.06em]" style={{ color: PHONE_A.accent }}>
          {PHONE_A.label}
        </p>
        <p className="mt-0.5 text-center text-[10px] text-ink-faint">{PHONE_A.status}</p>
        <p className="mt-0.5 text-center font-mono text-[10.5px] text-ink">{PHONE_A.ip}</p>
      </div>

      <div
        className="absolute -translate-x-1/2 transition-opacity duration-500"
        style={{ left: pct(PHONE_B.x, BOX.w), top: pct(PHONE_B.y + 90, BOX.h), opacity: phase >= 2 ? 1 : 0 }}
      >
        <p className="text-center font-mono text-[10.5px] font-semibold tracking-[0.06em]" style={{ color: PHONE_B.accent }}>
          {PHONE_B.label}
        </p>
        <p className="mt-0.5 text-center text-[10px] text-ink-faint">{PHONE_B.status}</p>
        <p className="mt-0.5 text-center font-mono text-[10.5px] text-ink">{PHONE_B.ip}</p>
      </div>

      {/* context engine */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(CORE.x, BOX.w), top: pct(CORE.y, BOX.h) }}>
        <ContextCore size={190} state={coreState} interactive={false} />
      </div>

      {/* network event / incident annotation */}
      <div
        className="absolute transition-opacity duration-500"
        style={{ left: pct(INCIDENT.x, BOX.w), top: pct(INCIDENT.y, BOX.h), opacity: phase >= 3 ? 1 : 0 }}
      >
        {phase < 4 ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-amber">NETWORK EVENT</span>
            </div>
            <p className="mt-1 max-w-[170px] text-[11.5px] leading-snug text-ink">Unexpected outbound destination observed</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-critical" />
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-status-critical">INC-0001</span>
            </div>
            <p className="mt-1 max-w-[170px] text-[12px] font-medium leading-snug text-ink">
              Context matched across device + network signal
            </p>
          </>
        )}
      </div>
    </div>
  );
}
