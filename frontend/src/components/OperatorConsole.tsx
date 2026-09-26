import { useEffect, useState } from "react";
import type { PreviewKey } from "../fixtures/previewKeys";

interface Props {
  scenarios: string[];
  previewKey: PreviewKey | null;
  actionError: string | null;
  onRunScenario: (scenario: string) => Promise<void>;
  onRunMismatchScenario: () => Promise<void>;
  onResetScenario: () => Promise<void>;
}

export function OperatorConsole({ scenarios, previewKey, actionError, onRunScenario, onRunMismatchScenario, onResetScenario }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(scenarios[0] ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && scenarios.length > 0) setSelected(scenarios[0]);
  }, [scenarios, selected]);

  const disabledReason = previewKey ? "Backend action unavailable in preview mode" : scenarios.length === 0 ? "Backend action unavailable" : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-10 rounded-sm border border-line bg-base-700 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-faint hover:border-ink-faint hover:text-ink"
      >
        OPERATOR
      </button>
    );
  }

  const run = async (fn: () => Promise<void>, label: string) => {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-10 flex w-72 flex-col gap-2 rounded-sm border border-line bg-base-700 p-3 shadow-[0_8px_30px_rgba(20,30,40,0.08)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-wide text-ink-faint">OPERATOR CONSOLE</span>
        <button onClick={() => setOpen(false)} className="text-[11px] text-ink-faint hover:text-ink">
          ×
        </button>
      </div>

      {disabledReason && (
        <p className="rounded-sm border border-line-soft bg-base-800/60 px-2 py-1.5 text-[10.5px] leading-snug text-ink-faint">{disabledReason}</p>
      )}

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={!!disabledReason}
        className="rounded-sm border border-line bg-base-800 px-2 py-1.5 text-[11.5px] text-ink disabled:opacity-50"
      >
        {scenarios.length === 0 && <option value="">No scenarios available</option>}
        {scenarios.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          disabled={!!disabledReason || !selected || !!busy}
          onClick={() => run(() => onRunScenario(selected), "scenario")}
          className="flex-1 rounded-sm bg-ink px-2 py-1.5 text-[11.5px] font-medium text-base-700 transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "scenario" ? "Running…" : "Run scenario"}
        </button>
        <button
          disabled={!!disabledReason || !!busy}
          onClick={() => run(onResetScenario, "reset")}
          className="rounded-sm border border-line px-2 py-1.5 text-[11.5px] font-medium text-ink-muted hover:border-status-critical/40 hover:text-status-critical disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "reset" ? "…" : "Reset"}
        </button>
      </div>

      <button
        disabled={!!disabledReason || !!busy}
        onClick={() => run(onRunMismatchScenario, "mismatch")}
        className="rounded-sm border border-amber/40 px-2 py-1.5 text-[11.5px] font-medium text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy === "mismatch" ? "Running…" : "Run mismatch test"}
      </button>

      {actionError && <p className="text-[10.5px] leading-snug text-status-critical">{actionError}</p>}

      <p className="text-[10px] leading-snug text-ink-faint">
        Replay streams pre-recorded sensor events through the same live ingestion &amp; fusion pipeline.
      </p>
    </div>
  );
}
