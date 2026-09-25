import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PrimaryButton, Wordmark } from "./ui";

const LINKS = [
  { href: "#problem", index: "01", label: "Problem" },
  { href: "#how-it-thinks", index: "02", label: "Approach" },
  { href: "#system", index: "03", label: "System" },
  { href: "#live", index: "04", label: "Live" },
];

export function Nav() {
  const [elevated, setElevated] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = LINKS.map((l) => document.getElementById(l.href.slice(1))).filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveHref(`#${visible[0].target.id}`);
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-context ${
        elevated ? "border-b border-line-soft bg-base-800/80 backdrop-blur" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between px-8">
        <Link to="/" className="flex items-center gap-2">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => {
            const active = activeHref === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 border-b pb-0.5 text-[12.5px] transition-colors duration-normal ${
                  active ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <span className={`font-mono text-[10px] ${active ? "text-ink-muted" : "text-ink-faint"}`}>{l.index}</span>
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-5">
          <a href="#footer" className="hidden text-[12.5px] text-ink-muted transition-colors hover:text-ink sm:inline">
            About
          </a>
          <PrimaryButton to="/mission-control">Launch Mission Control</PrimaryButton>
          <span className="relative hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong sm:flex" title="System live">
            <span className="h-1.5 w-1.5 animate-pulse_dot rounded-full bg-status-ok" />
          </span>
        </div>
      </div>
    </header>
  );
}
