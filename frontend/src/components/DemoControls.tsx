import { useState } from "react";

interface Props {
  scenarios: string[];
  onReplay: (scenario: string) => Promise<void>;
  onReset: () => Promise<void>;
}

export function DemoControls({ scenarios, onReplay, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(scenarios[0] ?? "");
  const [busy, setBusy] = useState(false);

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

  const run = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await onReplay(selected);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onReset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-10 flex w-64 flex-col gap-2 rounded-sm border border-line bg-base-700 p-3 shadow-[0_8px_30px_rgba(20,30,40,0.08)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-wide text-ink-faint">OPERATOR CONSOLE</span>
        <button onClick={() => setOpen(false)} className="text-[11px] text-ink-faint hover:text-ink">
          ×
        </button>
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-sm border border-line bg-base-800 px-2 py-1.5 text-[11.5px] text-ink"
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
          disabled={busy || !selected}
          onClick={run}
          className="flex-1 rounded-sm bg-ink px-2 py-1.5 text-[11.5px] font-medium text-base-700 transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Replay scenario
        </button>
        <button
          disabled={busy}
          onClick={reset}
          className="rounded-sm border border-line px-2 py-1.5 text-[11.5px] font-medium text-ink-muted hover:border-status-critical/40 hover:text-status-critical disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      <p className="text-[10px] leading-snug text-ink-faint">
        Replay streams pre-recorded sensor events through the same live ingestion &amp; fusion pipeline.
      </p>
    </div>
  );
}
