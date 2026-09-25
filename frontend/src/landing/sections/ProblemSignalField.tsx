import { useEffect, useState } from "react";

const BOX = { w: 760, h: 560 };
const NETWORK = { x: 380, y: 70 };
const PHONE_A = { x: 140, y: 300 };
const PHONE_B = { x: 440, y: 380 };
const DEST = { x: 660, y: 480 };

function pct(v: number, total: number) {
  return `${(v / total) * 100}%`;
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const c = (y2 - y1) * 0.5;
  return `M ${x1} ${y1} C ${x1} ${y1 + c}, ${x2} ${y2 - c}, ${x2} ${y2}`;
}

function PhoneNode({
  size,
  accent,
  label,
  sub,
  ip,
  time,
  badge,
  dim,
}: {
  size: number;
  accent: string;
  label: string;
  sub: string;
  ip: string;
  time: string;
  badge?: string;
  dim: boolean;
}) {
  return (
    <div className="flex flex-col items-center transition-opacity duration-500" style={{ opacity: dim ? 0.4 : 1 }}>
      <div className="relative">
        <div
          className="rounded-[18px]"
          style={{
            width: size * 0.52,
            height: size,
            background: "linear-gradient(160deg, #FFFFFF 0%, #EEF2F2 100%)",
            border: `1.5px solid ${accent}`,
            boxShadow: "0 22px 44px -20px rgba(15,22,23,0.28)",
          }}
        >
          <div className="absolute left-1/2 top-2.5 h-1 w-6 -translate-x-1/2 rounded-full bg-ink-faint/40" />
          <div
            className="absolute rounded-[8px]"
            style={{ inset: size * 0.09, top: size * 0.13, bottom: size * 0.1, backgroundColor: `${accent}12` }}
          />
        </div>
        {badge && (
          <span
            className="absolute -right-3 -top-2.5 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.05em] text-white"
            style={{ backgroundColor: accent }}
          >
            {badge}
          </span>
        )}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ bottom: -14, width: size * 0.42, height: 10, background: "radial-gradient(ellipse, rgba(17,23,24,0.16), transparent 70%)" }}
        />
      </div>
      <div className="mt-5 text-center">
        <span className="font-mono text-[11.5px] font-bold tracking-[0.08em]" style={{ color: accent }}>
          {label}
        </span>
        <p className="mt-0.5 text-[11px] font-medium text-ink-muted">{sub}</p>
        <p className="mt-1.5 font-mono text-[12px] font-semibold text-ink">{ip}</p>
        <p className="font-mono text-[10px] text-ink-faint">{time}</p>
      </div>
    </div>
  );
}

export function ProblemSignalField() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase(5);
      return;
    }
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1700),
      setTimeout(() => setPhase(4), 2300),
      setTimeout(() => setPhase(5), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const [hovered, setHovered] = useState<"phoneA" | "phoneB" | "network" | null>(null);
  const dimA = hovered !== null && hovered !== "phoneA";
  const dimB = hovered !== null && hovered !== "phoneB" && hovered !== "network";
  const dimNet = hovered !== null && hovered !== "network" && hovered !== "phoneB";

  return (
    <>
    <MobileSignalStack />
    <div className="relative mx-auto hidden w-full lg:block" style={{ aspectRatio: `${BOX.w}/${BOX.h}`, maxWidth: 780 }}>
      {/* background depth: grid + architectural guides + radial light */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 55% at 45% 25%, rgba(255,255,255,0.9), transparent 70%)" }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none">
          {[0.15, 0.5, 0.85].map((f) => (
            <line key={f} x1={BOX.w * f} y1="0" x2={BOX.w * f} y2={BOX.h} stroke="rgba(13,124,118,0.06)" strokeWidth="1" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1="0" y1={(BOX.h / 6) * i} x2={BOX.w} y2={(BOX.h / 6) * i} stroke="rgba(17,23,24,0.04)" strokeWidth="1" />
          ))}
        </svg>
      </div>

      {/* connection paths */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="xMidYMid meet">
        {/* Phone A -> network */}
        <g style={{ opacity: phase >= 1 ? (dimA ? 0.25 : 1) : 0, transition: "opacity 400ms ease" }}>
          <path
            id="path-a"
            d={bezier(PHONE_A.x, PHONE_A.y - 90, NETWORK.x - 60, NETWORK.y + 40)}
            fill="none"
            stroke="#4B5758"
            strokeWidth="1.8"
            strokeOpacity="0.55"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: phase >= 1 ? 0 : 1, transition: "stroke-dashoffset 700ms ease-out" }}
          />
          {phase >= 1 && (
            <circle r="2.6" fill="#4B5758" opacity="0.8">
              <animateMotion begin="0s" dur="2.8s" repeatCount="indefinite">
                <mpath href="#path-a" />
              </animateMotion>
            </circle>
          )}
        </g>

        {/* Phone B -> network */}
        <g style={{ opacity: phase >= 2 ? (dimB ? 0.25 : 1) : 0, transition: "opacity 400ms ease" }}>
          <path
            id="path-b"
            d={bezier(PHONE_B.x, PHONE_B.y - 110, NETWORK.x + 50, NETWORK.y + 40)}
            fill="none"
            stroke="#0D7C76"
            strokeWidth="2"
            strokeOpacity="0.7"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: phase >= 2 ? 0 : 1, transition: "stroke-dashoffset 700ms ease-out" }}
          />
          {phase >= 2 && (
            <circle r="2.8" fill="#0D7C76" opacity="0.9">
              <animateMotion begin="0s" dur="2.2s" repeatCount="indefinite">
                <mpath href="#path-b" />
              </animateMotion>
            </circle>
          )}
        </g>

        {/* Phone B -> destination (network event, amber) */}
        <g style={{ opacity: phase >= 3 ? (dimNet ? 0.3 : 1) : 0, transition: "opacity 400ms ease" }}>
          <path
            id="path-event"
            d={bezier(PHONE_B.x + 40, PHONE_B.y + 20, DEST.x - 40, DEST.y - 30)}
            fill="none"
            stroke="#B98232"
            strokeWidth="2"
            strokeOpacity="0.75"
            strokeDasharray="5 4"
            pathLength={1}
            style={{ strokeDashoffset: phase >= 3 ? 0 : 1, transition: "stroke-dashoffset 700ms ease-out" }}
          />
          {phase >= 3 && (
            <circle r="2.8" fill="#B98232">
              <animateMotion begin="0s" dur="1.8s" repeatCount="indefinite">
                <mpath href="#path-event" />
              </animateMotion>
            </circle>
          )}
        </g>
      </svg>

      {/* network hub */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500"
        style={{ left: pct(NETWORK.x, BOX.w), top: pct(NETWORK.y, BOX.h), opacity: phase >= 1 ? 1 : 0 }}
        onMouseEnter={() => setHovered("network")}
        onMouseLeave={() => setHovered(null)}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full border bg-white"
          style={{ borderColor: "rgba(13,124,118,0.4)", boxShadow: "0 14px 30px -14px rgba(15,22,23,0.3)" }}
        >
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <path d="M1 6.5C6 1.5 16 1.5 21 6.5" stroke="#0D7C76" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
            <path d="M5 10.5C8.5 7 13.5 7 17 10.5" stroke="#0D7C76" strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
            <circle cx="11" cy="14.5" r="1.9" fill="#0D7C76" />
          </svg>
        </div>
        <p className="mt-1.5 text-center font-mono text-[10px] font-semibold tracking-[0.08em] text-teal-dark">LOCAL NETWORK</p>
      </div>

      {/* Phone A */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
        style={{
          left: pct(PHONE_A.x, BOX.w),
          top: pct(PHONE_A.y, BOX.h),
          opacity: phase >= 1 ? 1 : 0,
          transform: `translate(-50%, ${phase >= 1 ? "-50%" : "-42%"}) scale(0.9)`,
        }}
        onMouseEnter={() => setHovered("phoneA")}
        onMouseLeave={() => setHovered(null)}
      >
        <PhoneNode size={120} accent="#4B5758" label="PHONE A" sub="Known device" ip="192.168.1.21" time="21:42:05 · connected" dim={dimA} />
      </div>

      {/* Phone B */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
        style={{
          left: pct(PHONE_B.x, BOX.w),
          top: pct(PHONE_B.y, BOX.h),
          opacity: phase >= 2 ? 1 : 0,
          transform: `translate(-50%, ${phase >= 2 ? "-50%" : "-42%"}) scale(1)`,
        }}
        onMouseEnter={() => setHovered("phoneB")}
        onMouseLeave={() => setHovered(null)}
      >
        <PhoneNode size={148} accent="#0D7C76" label="PHONE B" sub="New device observed" ip="192.168.1.37" time="21:42:08 · connected" badge={phase >= 2 ? "FIRST SEEN" : undefined} dim={dimB} />
      </div>

      {/* network event annotation */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700"
        style={{
          left: pct(DEST.x, BOX.w),
          top: pct(DEST.y, BOX.h),
          opacity: phase >= 3 ? (dimNet ? 0.4 : 1) : 0,
          transform: `translate(-50%, -50%) scale(0.88)`,
        }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#B98232" }} />
          <span className="font-mono text-[11px] font-bold tracking-[0.08em]" style={{ color: "#B98232" }}>
            NETWORK EVENT
          </span>
        </div>
        <p className="mt-1 max-w-[170px] text-[12px] font-semibold leading-snug text-ink">
          Unexpected outbound destination
        </p>
        <p className="mt-1 font-mono text-[10.5px] text-ink-faint">203.0.113.44</p>
      </div>
    </div>
    </>
  );
}

/** Vertical stacked variant for narrow viewports — the absolute-positioned
 * spatial scene above assumes real width to separate its nodes; below `lg`
 * it only overlaps, so mobile gets an independent, non-absolute layout. */
function MobileSignalStack() {
  return (
    <div className="flex flex-col gap-5 lg:hidden">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white"
          style={{ borderColor: "rgba(13,124,118,0.4)" }}
        >
          <svg width="18" height="15" viewBox="0 0 22 18" fill="none">
            <path d="M1 6.5C6 1.5 16 1.5 21 6.5" stroke="#0D7C76" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
            <path d="M5 10.5C8.5 7 13.5 7 17 10.5" stroke="#0D7C76" strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
            <circle cx="11" cy="14.5" r="1.9" fill="#0D7C76" />
          </svg>
        </div>
        <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-teal-dark">LOCAL NETWORK</span>
      </div>

      <div className="ml-[21px] flex flex-col gap-4 border-l border-line-soft pl-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-8 shrink-0 items-center justify-center rounded-[8px] border" style={{ borderColor: "#4B5758" }}>
            <div className="h-1 w-3 rounded-full bg-ink-faint/40" />
          </div>
          <div>
            <span className="font-mono text-[11.5px] font-bold tracking-[0.06em]" style={{ color: "#4B5758" }}>
              PHONE A
            </span>
            <p className="text-[11px] text-ink-muted">Known device</p>
            <p className="font-mono text-[12px] font-semibold text-ink">192.168.1.21</p>
            <p className="font-mono text-[10px] text-ink-faint">21:42:05 · connected</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex h-16 w-9 shrink-0 items-center justify-center rounded-[8px] border-2" style={{ borderColor: "#0D7C76" }}>
            <div className="h-1 w-3 rounded-full bg-ink-faint/40" />
            <span
              className="absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-[0.04em] text-white"
              style={{ backgroundColor: "#0D7C76" }}
            >
              NEW
            </span>
          </div>
          <div>
            <span className="font-mono text-[11.5px] font-bold tracking-[0.06em]" style={{ color: "#0D7C76" }}>
              PHONE B
            </span>
            <p className="text-[11px] text-ink-muted">New device observed</p>
            <p className="font-mono text-[12px] font-semibold text-ink">192.168.1.37</p>
            <p className="font-mono text-[10px] text-ink-faint">21:42:08 · connected</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(185,130,50,0.12)" }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#B98232" }} />
          </div>
          <div>
            <span className="font-mono text-[11px] font-bold tracking-[0.06em]" style={{ color: "#B98232" }}>
              NETWORK EVENT
            </span>
            <p className="text-[12px] font-semibold text-ink">Unexpected outbound destination</p>
            <p className="font-mono text-[10.5px] text-ink-faint">203.0.113.44</p>
          </div>
        </div>
      </div>
    </div>
  );
}
