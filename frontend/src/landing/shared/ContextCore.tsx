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
  { rz: -14, tz: -46, scale: 1.16, opacity: 0.38 },
  { rz: 9, tz: -14, scale: 1.05, opacity: 0.55 },
  { rz: -4, tz: 20, scale: 0.94, opacity: 0.78 },
];

/**
 * The signature SENTRIX visual: a precision optical instrument (layered glass
 * plates + graphite frame + center lens) rendered with real CSS 3D transforms,
 * not a flat icon. `state` drives the plates from a loose idle pose to a
 * locked, aligned pose — used to echo "context resolved" moments outside the hero.
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
    setTilt({ x: py * -10, y: px * 14 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const locked = state === "locked";
  const aligning = state === "aligning";

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ width: size, height: size, perspective: size * 2.6 }}
      aria-hidden="true"
    >
      <div
        className={`absolute inset-0 ${reducedMotion.current ? "" : "animate-core-drift"}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${-16 + tilt.x}deg) rotateY(${24 + tilt.y}deg)`,
          }}
        >
          {/* depth shadow */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size * 0.82,
              height: size * 0.5,
              transform: `translateZ(-120px) rotateX(90deg)`,
              background: "radial-gradient(ellipse at center, rgba(21,26,31,0.22), transparent 70%)",
              filter: "blur(18px)",
            }}
          />

          {/* three interlocking plates */}
          {PLATE_ANGLES.map((p, i) => {
            const lockedRz = locked ? 0 : p.rz;
            const lockedTz = locked ? -10 + i * 10 : p.tz;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-[10px] transition-transform duration-[1100ms] ease-out"
                style={{
                  width: size * 0.62 * p.scale,
                  height: size * 0.62 * p.scale,
                  marginLeft: -(size * 0.62 * p.scale) / 2,
                  marginTop: -(size * 0.62 * p.scale) / 2,
                  transform: `translateZ(${lockedTz}px) rotateZ(${lockedRz}deg)`,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(246,247,246,0.22) 55%, rgba(233,236,238,0.15) 100%)",
                  border: "1px solid rgba(21,26,31,0.16)",
                  boxShadow: "0 24px 60px -28px rgba(15,22,28,0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
                  backdropFilter: "blur(1px)",
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
              transform: `translateZ(${locked ? 34 : 10}px)`,
              transition: "transform 1000ms ease-out",
            }}
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(21,26,31,0.55)" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(21,26,31,0.2)" strokeWidth="0.6" strokeDasharray="1 5" />
            {[0, 90, 180, 270].map((deg) => (
              <line
                key={deg}
                x1="50"
                y1="1"
                x2="50"
                y2="7"
                stroke="rgba(21,26,31,0.6)"
                strokeWidth="0.8"
                transform={`rotate(${deg} 50 50)`}
              />
            ))}
          </svg>

          {/* center lens */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full transition-transform duration-[1000ms] ease-out"
            style={{
              width: size * 0.22,
              height: size * 0.22,
              marginLeft: -(size * 0.11),
              marginTop: -(size * 0.11),
              transform: `translateZ(${locked ? 52 : 30}px)`,
              background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(220,225,228,0.4) 60%, rgba(190,197,202,0.35) 100%)",
              border: "1px solid rgba(21,26,31,0.28)",
              boxShadow: "0 12px 30px -12px rgba(15,22,28,0.45)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
