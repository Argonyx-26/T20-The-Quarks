import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1120px] px-6 ${className}`}>{children}</div>;
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
      className={`group inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[13px] font-medium text-ink transition-colors duration-normal hover:border-ink-faint hover:bg-base-700 ${className}`}
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-normal group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        ↗
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
            ? "bg-ink text-base-700 group-hover:bg-ink/90"
            : "border border-line-strong text-ink group-hover:border-ink-faint"
        }`}
      >
        {icon}
      </span>
      <span className={`text-[14px] ${emphasis ? "font-medium text-ink" : "text-ink-muted"}`}>{children}</span>
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
  const cls = `inline-flex items-center gap-2 rounded-sm border border-line px-5 py-2.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink ${className}`;
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
    <span className={`text-[14px] font-medium tracking-[0.32em] text-ink ${className}`}>
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
