import { useEffect, useRef, useState } from "react";

type CoreState = "idle" | "aligning" | "locked";

interface Props {
  /** Base size in px at scale 1 (the "hero" footprint). Compact placements pass a smaller value. */
  size?: number;
  state?: CoreState;
  /** Disables mouse parallax — used when the Core sits in a small, non-hero context. */
  interactive?: boolean;
  className?: string;
}

const PLATE_ANGLES = [
  { rz: -14, scale: 1.16, opacity: 0.38 },
  { rz: 9, scale: 1.05, opacity: 0.55 },
  { rz: -4, scale: 0.94, opacity: 0.78 },
];

/**
 * The signature SENTRIX visual: a precision optical instrument (layered glass
 * plates + graphite frame + center lens) rendered flat-on (Z=0). `state` drives 
 * the plates from a loose idle pose to a locked, aligned pose.
 */
export function ContextCore({ size = 440, state = "idle", interactive = true, className = "" }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || reducedMotion.current) return;
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    // Increased multiplier to make the core more movable
    setTilt({ x: py * 24, y: px * 24 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const locked = state === "locked";
  const aligning = state === "aligning";

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className={`relative flex items-center justify-center w-full h-full ${reducedMotion.current ? "" : "animate-core-drift"}`}>
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-out flex items-center justify-center"
          style={{
            transform: `translateX(${tilt.y}px) translateY(${tilt.x}px)`,
          }}
        >
          {/* subtle flat contact shadow */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size * 0.85,
              height: size * 0.85,
              background: "radial-gradient(circle at center, rgba(18,55,54,0.08) 0%, transparent 65%)",
              filter: "blur(14px)",
              transform: `translateY(${size * 0.05}px)`,
            }}
          />

          {/* three interlocking plates */}
          {PLATE_ANGLES.map((p, i) => {
            const lockedRz = locked ? 0 : p.rz;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-[10px] transition-transform duration-[1100ms] ease-out"
                style={{
                  width: size * 0.62 * p.scale,
                  height: size * 0.62 * p.scale,
                  marginLeft: -(size * 0.62 * p.scale) / 2,
                  marginTop: -(size * 0.62 * p.scale) / 2,
                  transform: `rotate(${lockedRz}deg)`,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(246,247,246,0.22) 55%, rgba(233,236,238,0.15) 100%)",
                  border: "1px solid rgba(18,55,54,0.16)",
                  boxShadow: "0 12px 30px -10px rgba(18,55,54,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
                  backdropFilter: "blur(2px)",
                  opacity: aligning || locked ? Math.min(1, p.opacity + 0.2) : p.opacity,
                }}
              />
            );
          })}

          {/* graphite frame ring */}
          <svg
            className="absolute left-1/2 top-1/2"
            width={size * 0.7}
            height={size * 0.7}
            viewBox="0 0 100 100"
            style={{
              marginLeft: -(size * 0.35),
              marginTop: -(size * 0.35),
              transform: locked ? "scale(1.02)" : "scale(1)",
              transition: "transform 1000ms ease-out",
            }}
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(21,26,31,0.55)" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(21,26,31,0.2)" strokeWidth="0.6" strokeDasharray="1 5" />
            {Array.from({ length: 24 }).map((_, i) => {
              const deg = i * 15;
              const major = deg % 90 === 0;
              return (
                <line
                  key={deg}
                  x1="50"
                  y1="1"
                  x2="50"
                  y2={major ? "7" : "4"}
                  stroke={major ? "rgba(21,26,31,0.6)" : "rgba(21,26,31,0.3)"}
                  strokeWidth={major ? 0.8 : 0.5}
                  transform={`rotate(${deg} 50 50)`}
                />
              );
            })}
          </svg>

          {/* center lens */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full transition-transform duration-[1000ms] ease-out"
            style={{
              width: size * 0.22,
              height: size * 0.22,
              marginLeft: -(size * 0.11),
              marginTop: -(size * 0.11),
              transform: locked ? "scale(1.08)" : "scale(1)",
              background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,1), rgba(230,234,236,0.85) 40%, rgba(200,208,212,0.4) 100%)",
              border: "1px solid rgba(18,55,54,0.22)",
              boxShadow: "0 8px 24px -6px rgba(18,55,54,0.25), inset 0 2px 4px rgba(255,255,255,0.9)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
