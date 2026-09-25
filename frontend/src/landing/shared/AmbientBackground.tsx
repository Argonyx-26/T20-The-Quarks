import { useEffect, useRef } from "react";

type RGB = [number, number, number];

const TEAL_BRIGHT: RGB = [27, 154, 146]; // teal.bright
const TEAL_MUTED: RGB = [138, 190, 185]; // legible mid-tone between teal.pale and teal.bright
const GRAPHITE: RGB = [18, 23, 24]; // ink

interface Particle {
  x: number; // fractional 0..1
  y: number; // fractional 0..1
  r: number; // radius px
  o: number; // base opacity
  vx: number; // fractional units / ms
  vy: number; // fractional units / ms
  phase: number;
  wobble: number; // fractional amplitude
  color: RGB;
}

function densityFor(width: number) {
  if (width < 640) return 14;
  if (width < 1024) return 26;
  return 44;
}

function makeParticles(n: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    const color = roll < 0.6 ? TEAL_BRIGHT : roll < 0.9 ? TEAL_MUTED : GRAPHITE;
    const large = Math.random() < 0.12;
    particles.push({
      x: Math.random(),
      y: Math.random(),
      r: large ? 2.2 + Math.random() * 0.8 : 0.9 + Math.random() * 1.1,
      o: 0.1 + Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.000016,
      vy: -0.000006 - Math.random() * 0.000012,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.003 + Math.random() * 0.005,
      color,
    });
  }
  return particles;
}

/**
 * One persistent ambient layer (soft teal gradient + very slow canvas
 * particles) mounted once behind the entire landing page. Sections stay
 * transparent (see Section in ui.tsx) so this reads as a single continuous
 * environment rather than a per-section effect.
 */
export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let particles = makeParticles(densityFor(window.innerWidth));
    let raf = 0;
    let last = performance.now();

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = makeParticles(densityFor(w));
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        const wobbleX = Math.sin(p.phase) * p.wobble;
        const [r, g, b] = p.color;
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r},${g},${b},${p.o})`;
        ctx!.arc((p.x + wobbleX) * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function step(now: number) {
      const dt = now - last;
      last = now;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.phase += dt * 0.0003;
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
        if (p.y < -0.02) p.y = 1.02;
        if (p.y > 1.02) p.y = -0.02;
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    resize();
    draw();
    if (!reduced) raf = requestAnimationFrame(step);

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 78% 12%, rgba(27,154,146,0.075), transparent 38%), " +
            "radial-gradient(circle at 15% 78%, rgba(15,122,117,0.05), transparent 42%), " +
            "linear-gradient(180deg, #FBFCFC 0%, #F6F9F8 45%, #EFF6F5 100%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
