import { PREVIEW_KEYS, type PreviewKey } from "../fixtures/previewKeys";

/**
 * Dev-only state switcher for building/QA-ing every Mission Control UI
 * state without a backend. `import.meta.env.DEV` is statically replaced by
 * Vite, so this entire module (and the fixtures it links to) is dead-code
 * eliminated from a production build -- it cannot ship or be reached in
 * production regardless of URL.
 */
export function DevPreviewSwitcher({ current }: { current: PreviewKey | null }) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-3 left-3 z-10 flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-1 rounded-sm border border-line bg-base-700 p-2 shadow-[0_8px_30px_rgba(20,30,40,0.08)]">
      <span className="mr-1 font-mono text-[9px] tracking-wide text-ink-faint">DEV PREVIEW</span>
      <a
        href="?"
        className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] ${
          !current ? "border-teal bg-teal/10 text-teal-dark" : "border-line text-ink-faint hover:text-ink"
        }`}
      >
        live
      </a>
      {PREVIEW_KEYS.map((key) => (
        <a
          key={key}
          href={`?preview=${key}`}
          className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] ${
            current === key ? "border-teal bg-teal/10 text-teal-dark" : "border-line text-ink-faint hover:text-ink"
          }`}
        >
          {key}
        </a>
      ))}
    </div>
  );
}
