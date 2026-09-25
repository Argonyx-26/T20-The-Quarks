import type { ReactNode } from "react";

interface Props {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function Panel({ title, right, children, className = "", bodyClassName = "", noPadding = false }: Props) {
  return (
    <section className={`flex min-h-0 flex-col border border-line bg-base-700 ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted">{title}</h2>
        {right}
      </div>
      <div className={`min-h-0 flex-1 ${noPadding ? "" : "p-3"} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
