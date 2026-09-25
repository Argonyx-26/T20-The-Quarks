import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1480px] px-6 sm:px-10 lg:px-16 ${className}`}>{children}</div>;
}

export function Section({
  children,
  className = "",
  id,
  border = true,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  border?: boolean;
}) {
  return (
    <section id={id} className={`${border ? "border-t border-line-soft" : ""} py-20 sm:py-28 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function PrimaryButton({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 rounded-[8px] bg-teal px-5 py-2.5 text-[13px] font-semibold text-white transition-colors duration-normal hover:bg-teal-dark ${className}`}
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-normal group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

export function IconTextLink({
  to,
  href,
  icon,
  children,
  emphasis = false,
  onClick,
}: {
  to?: string;
  href?: string;
  icon: ReactNode;
  children: ReactNode;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-normal ${
          emphasis
            ? "bg-teal text-white group-hover:bg-teal-dark"
            : "border border-line-strong text-ink group-hover:border-teal"
        }`}
      >
        {icon}
      </span>
      <span className={`text-[14px] ${emphasis ? "font-semibold text-ink" : "text-ink-muted"}`}>{children}</span>
    </>
  );
  const cls = "group inline-flex items-center gap-3";
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} onClick={onClick} className={cls}>
      {inner}
    </a>
  );
}

export function SecondaryButton({
  href,
  children,
  className = "",
  onClick,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const cls = `inline-flex items-center gap-2 rounded-[8px] border border-teal/50 px-5 py-2.5 text-[13.5px] font-semibold text-teal-dark transition-colors hover:border-teal hover:bg-teal-ultrapale ${className}`;
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[15px] font-bold tracking-[0.28em] text-ink ${className}`}>
      SENTRIX
    </span>
  );
}

export function Eyebrow({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] text-ink-faint">{index}</span>
      <span className="h-px w-6 bg-line-strong" />
      <span className="text-[11px] font-medium tracking-[0.14em] text-ink-muted">{children}</span>
    </div>
  );
}
