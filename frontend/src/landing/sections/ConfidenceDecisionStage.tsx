import { useState } from "react";
import { Reveal } from "../shared/Reveal";

function MatchMismatchTabs({ mode, setMode }: { mode: "match" | "mismatch", setMode: (m: "match" | "mismatch") => void }) {
  return (
    <div className="flex border-b border-line">
      {(["match", "mismatch"] as const).map(m => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`flex-1 pb-3 text-[12px] font-mono font-bold tracking-[0.08em] transition-colors relative ${mode === m ? 'text-teal-dark' : 'text-ink-muted hover:text-ink'}`}
        >
          {m === 'match' ? 'MATCHED CONTEXT' : 'MISMATCHED CONTEXT'}
          {mode === m && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-dark" />
          )}
        </button>
      ))}
    </div>
  );
}

function EvidenceTimeline({ mode }: { mode: "match" | "mismatch" }) {
  const data = mode === "match" ? [
    { n: "01", k: "TIME", v: "8.2s", s: "MATCH", ok: true },
    { n: "02", k: "DEVICE", v: "Phone B → Phone A", s: "MATCH", ok: true },
    { n: "03", k: "NETWORK", v: "192.168.1.37", s: "MATCH", ok: true },
    { n: "04", k: "SOURCE", v: "3 independent signals", s: "MATCH", ok: true },
  ] : [
    { n: "01", k: "TIME", v: "31.4s", s: "MISMATCH", ok: false },
    { n: "02", k: "DEVICE", v: "Unknown device", s: "MISMATCH", ok: false },
    { n: "03", k: "NETWORK", v: "Unexpected subnet", s: "MISMATCH", ok: false },
    { n: "04", k: "SOURCE", v: "Single observation", s: "LOW CONFIDENCE", ok: false },
  ];

  return (
    <div className="relative pl-6 mt-6">
      <div className="absolute left-[9px] top-4 bottom-4 w-px bg-line" />
      <div className="flex flex-col gap-6">
        {data.map((d) => (
          <div key={d.k} className="relative flex items-center gap-6" style={{ animationFillMode: "both" }}>
            <div className={`absolute -left-[19.5px] h-3 w-3 rounded-full border-2 border-white ${d.ok ? 'bg-teal-dark' : 'bg-amber'}`} />
            
            <div className="flex-1 border border-line bg-white px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-ink-faint">{d.n}</span>
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-ink">{d.k}</p>
                  <p className="mt-0.5 text-[14px] font-medium text-ink-muted">{d.v}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${d.ok ? 'bg-teal-dark' : 'bg-amber'}`} />
                <span className={`font-mono text-[10px] font-bold tracking-[0.1em] ${d.ok ? 'text-teal-dark' : 'text-amber'}`}>{d.s}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Confidence result at the end of timeline */}
      <div className="relative mt-8 flex items-center gap-6">
        <div className={`absolute -left-[19.5px] h-3 w-3 rounded-full border-2 border-white ${mode === 'match' ? 'bg-status-critical' : 'bg-line-strong'}`} />
        <div className="flex-1 px-5 py-2">
          <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-ink-faint">CONFIDENCE</p>
          <div className="flex items-end gap-3 mt-1">
            <span className={`text-[24px] font-display font-bold leading-none ${mode === 'match' ? 'text-ink' : 'text-ink-muted'}`}>
              {mode === 'match' ? '92%' : '41%'}
            </span>
            <span className="text-[12px] font-medium text-ink-faint mb-0.5">
              {mode === 'match' ? 'Above threshold' : 'Below threshold'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionGraphic({ mode }: { mode: "match" | "mismatch" }) {
  const isMatch = mode === "match";
  return (
    <div className="relative border border-line bg-white p-8 flex flex-col items-center text-center h-full justify-center overflow-hidden shadow-sm">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: "linear-gradient(rgba(18,55,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(18,55,54,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />
      <div className="relative flex flex-col items-center gap-4 text-ink-muted w-full z-10">
        <span className="font-mono text-[10px] font-bold tracking-[0.15em]">SIGNALS</span>
        <div className="h-6 w-px bg-line-strong" />
        
        <span className="font-mono text-[10px] font-bold tracking-[0.15em]">CORRELATION</span>
        <div className="h-6 w-px bg-line-strong" />
        
        <div className={`flex items-center justify-center h-20 w-20 rounded-full border ${isMatch ? 'border-teal-dark bg-teal/5 text-teal-dark shadow-[0_0_15px_rgba(15,122,117,0.15)]' : 'border-line-strong text-ink-muted'}`}>
          <span className="font-display text-[24px] font-bold">{isMatch ? '92%' : '41%'}</span>
        </div>
        
        <div className="h-6 w-px bg-line-strong" />
        
        <div className="border border-amber bg-amber/5 px-4 py-2 rounded-[4px]">
          <span className="font-mono text-[9px] font-bold text-amber tracking-[0.1em]">THRESHOLD 75%</span>
        </div>
        
        <div className={`h-8 w-px ${isMatch ? 'bg-status-critical' : 'bg-line-strong'}`} />
        
        {isMatch ? (
          <div className="bg-status-critical text-white px-8 py-4 w-full rounded-sm shadow-[0_4px_14px_rgba(199,93,86,0.25)] flex items-center justify-center gap-2">
            <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
            <span className="font-mono text-[13px] font-bold tracking-[0.2em]">ACT</span>
          </div>
        ) : (
          <div className="border border-line-strong text-ink-faint px-8 py-4 w-full rounded-sm flex items-center justify-center gap-2">
            <span className="h-2 w-2 bg-line-strong rounded-full" />
            <span className="font-mono text-[13px] font-bold tracking-[0.2em]">HOLD</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfidenceDecisionStage() {
  const [mode, setMode] = useState<"match" | "mismatch">("match");

  return (
    <Reveal className="mt-20 flex flex-col gap-20 pb-20">
      {/* HERO / INTRODUCTION */}
      <div className="text-center sm:text-left">
        <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-teal-dark">05 · CONFIDENCE</span>
        <h2 className="mt-3 text-[42px] font-display font-bold leading-[1.0] tracking-tight text-ink sm:text-[56px] lg:text-[64px]">
          Context becomes a decision.
        </h2>
        <p className="mt-4 text-[16px] font-medium leading-relaxed text-ink-muted sm:text-[18px]">
          Only when independent signals agree does SENTRIX create an incident.
        </p>
      </div>

      {/* CENTRAL CONFIDENCE VISUAL */}
      <div className="relative border border-line bg-white p-8 sm:p-12 overflow-hidden shadow-[0_8px_30px_rgba(20,30,40,0.04)]">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ backgroundImage: "linear-gradient(rgba(18,55,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(18,55,54,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        
        {/* Subtle teal accent gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-transparent opacity-60" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-8 z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-status-critical animate-pulse" />
              <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-ink">CONTEXT ALIGNED</span>
            </div>
            <h3 className="mt-5 text-[64px] font-display font-bold leading-none text-ink tracking-tight sm:text-[88px]">
              92<span className="text-[40px] text-teal-dark">%</span>
            </h3>
            <p className="mt-2 font-mono text-[12px] font-bold tracking-[0.1em] text-teal-dark">CONFIDENCE</p>
            <p className="mt-1 text-[13px] text-ink-muted font-medium tracking-wide">MATCH THRESHOLD EXCEEDED</p>
          </div>
          <div className="sm:text-right hidden sm:block">
            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink-faint">DECISION</p>
            <p className="mt-1 font-mono text-[20px] font-bold tracking-[0.1em] text-ink">ACT</p>
          </div>
        </div>

        <div className="relative h-16 w-full mt-10">
          {/* the meter rail */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-line-strong -translate-y-1/2" />
          
          {/* the fill (0 to 92%) */}
          <div className="absolute top-1/2 left-0 h-[3px] bg-teal-dark -translate-y-1/2 transition-all duration-1000 ease-out" style={{ width: '92%' }} />
          
          {/* ticks */}
          {[0, 25, 50, 75, 100].map(t => (
            <div key={t} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${t}%`, transform: 'translate(-50%, -50%)' }}>
              <div className={`w-px h-3 ${t === 75 ? 'bg-amber' : 'bg-line-strong'}`} />
              <span className="mt-4 font-mono text-[9px] font-semibold text-ink-faint">{t}%</span>
            </div>
          ))}

          {/* Threshold line */}
          <div className="absolute top-0 bottom-0 border-l border-dashed border-amber w-px" style={{ left: '75%' }} />
          <span className="absolute top-full mt-2 font-mono text-[9px] font-bold text-amber -translate-x-1/2" style={{ left: '75%' }}>THRESHOLD</span>

          {/* Observed 92% indicator */}
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '92%', transform: 'translate(-50%, -50%)' }}>
            <div className="h-5 w-5 rounded-full border-[3px] border-white bg-teal-dark shadow-[0_0_16px_rgba(15,122,117,0.5)]" />
          </div>
        </div>
      </div>

      {/* POSITIVE AND NEGATIVE CASES / EVIDENCE TIMELINE */}
      <div>
        <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-ink-faint mb-6">SIGNAL EVIDENCE CHAIN</p>
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col">
            <MatchMismatchTabs mode={mode} setMode={setMode} />
            <EvidenceTimeline mode={mode} />
          </div>
          <DecisionGraphic mode={mode} />
        </div>
      </div>
    </Reveal>
  );
}
