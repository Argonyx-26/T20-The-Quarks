import { useState } from "react";
import { Reveal } from "../shared/Reveal";
import { Section } from "../shared/ui";
import { ContextCore } from "../shared/ContextCore";

type StepId = "time" | "device" | "network" | "sources" | "confidence";

const STEPS: { id: StepId; num: string; label: string }[] = [
  { id: "time", num: "01", label: "TIME" },
  { id: "device", num: "02", label: "DEVICE" },
  { id: "network", num: "03", label: "NETWORK" },
  { id: "sources", num: "04", label: "SOURCES" },
  { id: "confidence", num: "05", label: "CONFIDENCE" },
];

const SIGNALS = [
  { id: "vision", label: "VISION", title: "Restricted-zone presence detected", meta: "person_in_restricted_zone", color: "#4779BD", y: 150 },
  { id: "endpoint", label: "ENDPOINT", title: "USB device attached", meta: "usb_device_attached", color: "#785EAB", y: 300 },
  { id: "network", label: "NETWORK", title: "Unusual outbound activity", meta: "outbound_deviation", color: "#138983", y: 450 },
];

function SignalNode({ signal, activeStep }: { signal: typeof SIGNALS[0], activeStep: StepId }) {
  const isSelected = activeStep === 'sources' || activeStep === 'confidence';
  const isActive = isSelected || 
    (activeStep === 'time') ||
    (activeStep === 'device' && (signal.id === 'endpoint' || signal.id === 'network')) ||
    (activeStep === 'network' && signal.id === 'network');
    
  return (
    <div className={`relative flex flex-col transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
       <div className="flex items-center gap-2 mb-2">
         <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: signal.color }} />
         <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: signal.color }}>
            {signal.label}
         </span>
       </div>
       <h4 className="text-[16px] font-semibold text-ink leading-snug">{signal.title}</h4>
       <span className="mt-1 font-mono text-[11px] text-ink-faint">{signal.meta}</span>
       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-line-strong hidden lg:block" />
    </div>
  )
}

function StepContent({ activeStep }: { activeStep: StepId }) {
  return (
    <div key={activeStep} className="relative w-full" style={{ animation: 'approachFadeSlide 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      <style>{`
        @keyframes approachFadeSlide {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      
       {activeStep === "time" && (
         <div className="p-6 border border-line bg-base-900/50 shadow-sm">
           <span className="font-mono text-[10px] tracking-[0.1em] text-ink-faint">TEMPORAL CORRELATION</span>
           <div className="mt-5 flex flex-col gap-2 font-mono text-[12px]">
             <div className="flex justify-between items-center text-ink-muted">
               <span>EVENT WINDOW</span>
               <span className="text-teal-dark font-bold">21:42:05 &rarr; 21:42:08</span>
             </div>
             <div className="h-px bg-line-soft my-2" />
             <div className="flex justify-between items-center">
               <span className="text-ink-faint">Correlation window</span>
               <span className="text-ink font-semibold">3.0s</span>
             </div>
           </div>
           <p className="mt-5 text-[12px] text-ink-muted leading-relaxed">
             The system detects multiple signals occurring within a meaningful temporal window. Events occurring close together may be related, but time alone is not enough.
           </p>
         </div>
       )}
       {activeStep === "device" && (
         <div className="p-6 border border-line bg-base-900/50 shadow-sm">
           <span className="font-mono text-[10px] tracking-[0.1em] text-ink-faint">DEVICE RELATIONSHIP</span>
           <div className="mt-5 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="font-mono text-[12px] font-bold text-ink">PHONE A</span>
                <span className="font-mono text-[10px] text-ink-faint">192.168.1.21</span>
             </div>
             <div className="h-px w-8 bg-line-strong border-dashed" />
             <div className="flex flex-col text-right">
                <span className="font-mono text-[12px] font-bold text-ink">PHONE B</span>
                <span className="font-mono text-[10px] text-ink-faint">192.168.1.37</span>
             </div>
           </div>
           <p className="mt-5 text-[12px] text-ink-muted leading-relaxed">
             Digital events become stronger evidence when they reference the same monitored asset. Both the endpoint attachment and network request map to the same physical device context.
           </p>
         </div>
       )}
       {activeStep === "network" && (
         <div className="p-6 border border-line bg-base-900/50 shadow-sm">
           <span className="font-mono text-[10px] tracking-[0.1em] text-ink-faint">NETWORK BEHAVIOR</span>
           <div className="mt-5 grid grid-cols-2 gap-4">
             <div>
               <span className="block font-mono text-[9px] text-ink-faint mb-1">EXPECTED</span>
               <span className="block text-[12px] font-medium text-ink">Normal local traffic</span>
             </div>
             <div>
               <span className="block font-mono text-[9px] text-amber mb-1">OBSERVED</span>
               <span className="block text-[12px] font-medium text-ink">Unexpected outbound</span>
               <span className="block font-mono text-[10px] text-ink-faint mt-1">203.0.113.44</span>
             </div>
           </div>
           <p className="mt-5 text-[12px] text-ink-muted leading-relaxed">
             Traffic destined for an external IP address diverges from established baseline behaviors for this device class and network context.
           </p>
         </div>
       )}
       {activeStep === "sources" && (
         <div className="p-6 border border-line bg-base-900/50 shadow-sm">
           <span className="font-mono text-[10px] tracking-[0.1em] text-ink-faint">EVIDENCE DOMAINS</span>
           <div className="mt-5 flex flex-col gap-3">
             <div className="flex justify-between items-center">
               <span className="font-mono text-[10px]" style={{ color: "#4779BD" }}>VISION</span>
               <span className="text-[11px] text-ink-muted">Physical-space signal</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="font-mono text-[10px]" style={{ color: "#785EAB" }}>ENDPOINT</span>
               <span className="text-[11px] text-ink-muted">Device activity</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="font-mono text-[10px]" style={{ color: "#138983" }}>NETWORK</span>
               <span className="text-[11px] text-ink-muted">Network behavior</span>
             </div>
           </div>
           <p className="mt-5 text-[12px] text-ink-muted leading-relaxed">
             Independent systems supporting the same story. Three distinct sensor types independently corroborate the same unfolding event sequence.
           </p>
         </div>
       )}
       {activeStep === "confidence" && (
         <div className="p-6 border border-line bg-base-900/50 shadow-sm">
           <span className="font-mono text-[10px] tracking-[0.1em] text-ink-faint">DECISION THRESHOLD</span>
           <div className="mt-5 flex items-end justify-between">
             <div>
               <span className="block font-display text-[32px] font-bold text-teal-dark leading-none">92%</span>
               <span className="block font-mono text-[9px] text-ink-muted mt-1">OBSERVED CONFIDENCE</span>
             </div>
             <div className="text-right">
               <span className="block font-display text-[20px] font-medium text-ink-muted leading-none">75%</span>
               <span className="block font-mono text-[9px] text-amber mt-1">ACTION THRESHOLD</span>
             </div>
           </div>
           
           <div className="relative h-1.5 w-full bg-line-soft mt-5 rounded-full overflow-hidden">
             <div className="absolute top-0 left-0 h-full bg-teal-dark rounded-full transition-all duration-1000 ease-out" style={{ width: '92%' }} />
             <div className="absolute top-0 bottom-0 w-px bg-amber z-10" style={{ left: '75%' }} />
           </div>

           <p className="mt-5 text-[12px] text-ink-muted leading-relaxed">
             Only after enough contextual conditions agree can the system create an incident. With 3 corroborating signals, the context exceeds the strict operational threshold.
           </p>
         </div>
       )}
    </div>
  )
}

function ResolutionPanel({ activeStep }: { activeStep: StepId }) {
  return (
    <div className="flex flex-col h-full justify-center gap-12 w-full max-w-sm">
      <div className={`border-l-2 pl-5 transition-colors duration-500 ${activeStep === 'confidence' ? 'border-status-critical' : 'border-line-strong'}`}>
         <p className={`font-mono text-[10px] font-bold tracking-[0.1em] transition-colors duration-500 ${activeStep === 'confidence' ? 'text-status-critical' : 'text-ink-faint'}`}>CONTEXT RESOLVED</p>
         <p className="mt-2 font-mono text-[22px] font-bold text-ink transition-opacity duration-500">INC-0001</p>
         <p className="mt-1 text-[13px] text-ink-muted">Suspicious multi-signal activity</p>
         <div className={`mt-3 flex gap-4 font-mono text-[10px] font-medium transition-colors duration-500 ${activeStep === 'confidence' ? 'text-teal-dark' : 'text-ink-faint'}`}>
            <span>92% confidence</span>
            <span>3 signals</span>
         </div>
      </div>
      <div className="relative min-h-[160px]">
         <StepContent activeStep={activeStep} />
      </div>
    </div>
  )
}

function StepRail({ activeStep, onChange }: { activeStep: StepId, onChange: (id: StepId) => void }) {
  return (
    <div className="flex flex-col gap-8 border-l border-line-soft pl-6 py-12">
      {STEPS.map(s => {
         const isActive = activeStep === s.id;
         return (
           <button 
             key={s.id} 
             onClick={() => onChange(s.id)}
             className={`flex flex-col gap-1 text-left transition-all duration-300 group ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
           >
             <div className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-teal-dark' : 'bg-transparent border border-line-strong'}`} />
                <span className={`font-mono text-[10px] font-bold tracking-[0.05em] transition-transform duration-300 ${isActive ? 'translate-x-1 text-teal-dark' : 'text-ink-muted'}`}>{s.num}</span>
             </div>
             <span className={`font-mono text-[11px] font-semibold tracking-[0.05em] pl-4 transition-transform duration-300 ${isActive ? 'translate-x-1 text-ink' : 'text-ink-muted'}`}>{s.label}</span>
           </button>
         )
      })}
    </div>
  )
}

function ConnectorPaths({ activeStep }: { activeStep: StepId }) {
   return (
     <svg viewBox="0 0 1200 600" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {SIGNALS.map((s, i) => {
          const startX = 400;
          const endX = 650;
          const startY = s.y;
          const endY = 300;
          
          const cpX1 = startX + (endX - startX) * 0.4;
          const cpX2 = endX - (endX - startX) * 0.4;
          const path = `M ${startX} ${startY} C ${cpX1} ${startY}, ${cpX2} ${endY}, ${endX} ${endY}`;
          
          const isSelected = activeStep === 'sources' || activeStep === 'confidence';
          const isActive = isSelected || 
            (activeStep === 'time') ||
            (activeStep === 'device' && (s.id === 'endpoint' || s.id === 'network')) ||
            (activeStep === 'network' && s.id === 'network');

          return (
             <g key={s.id}>
               <path id={`approach-path-${s.id}`} d={path} fill="none" stroke={s.color} strokeWidth="1.5" strokeOpacity={isActive ? 0.5 : 0.1} vectorEffect="non-scaling-stroke" className="transition-opacity duration-500" />
               {isActive && (
                 <circle r="2.5" fill={s.color} className="opacity-80">
                   <animateMotion dur={`${2.5 + i * 0.2}s`} repeatCount="indefinite">
                     <mpath href={`#approach-path-${s.id}`} />
                   </animateMotion>
                 </circle>
               )}
             </g>
          )
        })}
        {/* Output path from Core to Resolution panel */}
        <path id="approach-output-path" d="M 650 300 L 900 300" fill="none" stroke="#0F7A75" strokeWidth="1.5" strokeOpacity={activeStep === 'confidence' ? 0.6 : 0.15} vectorEffect="non-scaling-stroke" className="transition-opacity duration-500" />
        
        {(activeStep === 'confidence' || activeStep === 'sources') && (
          <circle r="2.5" fill="#0F7A75" className="opacity-80">
            <animateMotion dur="2s" repeatCount="indefinite">
              <mpath href="#approach-output-path" />
            </animateMotion>
          </circle>
        )}
     </svg>
   )
}

function ApproachCanvas({ activeStep, onStepChange }: { activeStep: StepId, onStepChange: (id: StepId) => void }) {
   return (
      <div className="hidden lg:grid grid-cols-12 gap-0 relative min-h-[600px] aspect-[21/9] w-full bg-base-800 border border-line-soft rounded-lg overflow-hidden my-16 shadow-sm">
         
         {/* Very subtle architectural grid inside the canvas */}
         <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "linear-gradient(rgba(18,55,54,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(18,55,54,0.02) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
         />
         
         <ConnectorPaths activeStep={activeStep} />
         
         <div className="col-start-2 col-end-5 flex flex-col justify-between py-[12%] relative z-10 pr-8">
            {SIGNALS.map(s => <SignalNode key={s.id} signal={s} activeStep={activeStep} />)}
         </div>

         <div className="col-start-6 col-end-9 flex items-center justify-center relative z-10">
            <ContextCore size={280} state={activeStep === 'confidence' ? "locked" : "aligning"} />
         </div>

         <div className="col-start-10 col-end-12 flex flex-col justify-center relative z-10">
            <ResolutionPanel activeStep={activeStep} />
         </div>

         <div className="col-start-12 col-end-13 flex flex-col justify-center relative z-10">
            <StepRail activeStep={activeStep} onChange={onStepChange} />
         </div>
      </div>
   );
}

function MobileApproach({ activeStep, onStepChange }: { activeStep: StepId, onStepChange: (id: StepId) => void }) {
   return (
      <div className="flex flex-col lg:hidden px-4 pb-16 pt-8 w-full max-w-lg mx-auto">
         <div className="flex justify-center py-8">
            <ContextCore size={220} state={activeStep === 'confidence' ? "locked" : "aligning"} />
         </div>

         <div className="flex flex-col gap-6 mb-12 border-l border-line-soft pl-6 ml-4">
            {SIGNALS.map(s => {
               const isActive = activeStep === 'sources' || activeStep === 'confidence' || 
                 (activeStep === 'time') ||
                 (activeStep === 'device' && (s.id === 'endpoint' || s.id === 'network')) ||
                 (activeStep === 'network' && s.id === 'network');
                 
               return (
                  <div key={s.id} className={`relative transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                     <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                     <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: s.color }}>{s.label}</span>
                     </div>
                     <h4 className="text-[14px] font-semibold text-ink leading-snug">{s.title}</h4>
                     <span className="mt-1 font-mono text-[10px] text-ink-faint">{s.meta}</span>
                  </div>
               )
            })}
         </div>

         <div className="flex gap-3 overflow-x-auto pb-4 mb-8 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {STEPS.map(s => {
               const isActive = activeStep === s.id;
               return (
                  <button 
                    key={s.id} 
                    onClick={() => onStepChange(s.id)}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 border rounded-full transition-colors snap-center ${isActive ? 'border-teal-dark bg-teal/5 text-teal-dark' : 'border-line text-ink-muted'}`}
                  >
                    <span className="font-mono text-[10px] font-bold">{s.num}</span>
                    <span className="font-mono text-[11px] font-semibold">{s.label}</span>
                  </button>
               )
            })}
         </div>

         <div className="mb-8">
            <ResolutionPanel activeStep={activeStep} />
         </div>
      </div>
   );
}

function SystemStrip() {
  return (
    <div className="border-t border-line-soft w-full mt-12 bg-base-900">
      <div className="mx-auto max-w-[1440px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0">
        
        <div className="col-span-1 lg:col-start-2 lg:col-end-6 py-12 px-6 lg:px-0">
          <p className="font-mono text-[10px] text-ink-faint tracking-[0.1em] mb-4">02 // DOMAINS</p>
          <p className="text-[12px] font-semibold text-ink uppercase tracking-wide mb-6">THREE DOMAINS.<br/>ONE CONTEXT.</p>
          <div className="flex gap-8">
             <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#4779BD]">VISION</span>
                <span className="text-[11px] text-ink-muted">Physical space</span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#785EAB]">ENDPOINT</span>
                <span className="text-[11px] text-ink-muted">Device activity</span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#138983]">NETWORK</span>
                <span className="text-[11px] text-ink-muted">Network behavior</span>
             </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-start-7 lg:col-end-12 py-12 px-6 lg:px-12 lg:border-l border-line-soft">
          <p className="font-mono text-[10px] text-ink-faint tracking-[0.1em] mb-4">03 // NEXT</p>
          <p className="text-[14px] font-semibold text-ink tracking-tight mb-2">CONTEXT CREATES CLARITY.</p>
          <p className="text-[12px] text-ink-muted max-w-sm leading-relaxed">
            When signals are aligned in a unified coordinate system, operational ambiguity drops to near zero.
          </p>
        </div>

      </div>
    </div>
  )
}

export function FusionModel() {
  const [activeStep, setActiveStep] = useState<StepId>("time");
  
  return (
    <Section id="how-it-thinks" className="relative overflow-hidden pt-24 border-t border-line-soft bg-base-900">
      
      {/* Background Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: "linear-gradient(rgba(18,55,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(18,55,54,0.03) 1px, transparent 1px)", backgroundSize: "100px 100px", opacity: 0.5 }}
      />
      
      {/* Header */}
      <Reveal className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12">
         <span className="text-[11px] font-medium tracking-[0.14em] text-ink-faint uppercase">02 &middot; The Approach</span>
         <h2 className="mt-4 text-[38px] font-display font-bold leading-[1.05] tracking-tight text-ink sm:text-[52px] lg:text-[64px] max-w-[20ch]">
          Correlation isn't just timestamp matching.
         </h2>
         <p className="mt-6 text-[18px] font-display font-medium leading-[1.4] tracking-tight text-ink-muted max-w-[40ch]">
            Three signals arrive. <span className="font-bold text-teal-dark">SENTRIX</span> calibrates <span className="font-bold text-ink">five contextual dimensions</span> before confirming an incident.
         </p>
      </Reveal>

      {/* Master Canvas */}
      <Reveal className="relative mx-auto max-w-[1440px] w-full z-10 px-0 lg:px-12">
         <ApproachCanvas activeStep={activeStep} onStepChange={setActiveStep} />
         <MobileApproach activeStep={activeStep} onStepChange={setActiveStep} />
      </Reveal>

      <SystemStrip />
    </Section>
  );
}
