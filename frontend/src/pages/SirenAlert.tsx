import { useEffect, useState, useRef } from "react";
import { useMissionControl } from "../useMissionControl";

export default function SirenAlert() {
  const mc = useMissionControl();
  const [activated, setActivated] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Check if there is an active high-severity incident
  const activeIncident = mc.incidents.find(i => i.status === "OPEN" || i.status === "RESOLVED");

  useEffect(() => {
    if (activeIncident && activated && !isSirenPlaying) {
      startSiren();
    } else if (!activeIncident && isSirenPlaying) {
      stopSiren();
    }
  }, [activeIncident, activated, isSirenPlaying]);

  const startSiren = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Create master gain (volume)
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0; // Max volume
    gainNode.connect(ctx.destination);

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = "square"; // Harsh sound
    osc.connect(gainNode);
    osc.start();
    oscRef.current = osc;

    // Modulate frequency to create the "wail" effect
    let up = true;
    intervalRef.current = window.setInterval(() => {
      if (up) {
        osc.frequency.setTargetAtTime(1200, ctx.currentTime, 0.3);
      } else {
        osc.frequency.setTargetAtTime(600, ctx.currentTime, 0.3);
      }
      up = !up;
    }, 500);

    setIsSirenPlaying(true);
  };

  const stopSiren = () => {
    if (oscRef.current) {
      oscRef.current.stop();
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  if (!activated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 text-center">
        <h1 className="text-3xl font-mono text-amber mb-8 uppercase tracking-widest border-b border-amber pb-4">SENTRIX Mobile Alert System</h1>
        <p className="text-xl text-ink-muted mb-12 font-mono max-w-md">
          To comply with browser security, you must tap the screen to activate the background alert system.
        </p>
        <button 
          onClick={() => setActivated(true)}
          className="px-12 py-6 bg-teal/20 text-teal border border-teal text-2xl font-bold font-mono tracking-widest rounded-lg animate-pulse"
        >
          ACTIVATE ALERTS
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center h-screen p-6 text-center transition-colors duration-300 ${isSirenPlaying ? 'bg-status-critical text-white' : 'bg-black text-teal'}`}>
      
      {isSirenPlaying ? (
        <div className="animate-pulse">
          <div className="text-9xl mb-8">⚠️</div>
          <h1 className="text-5xl font-black font-mono tracking-widest uppercase mb-4 text-white">INCIDENT DETECTED</h1>
          <h2 className="text-3xl font-bold font-mono mb-4">{activeIncident?.incident_id}</h2>
          <p className="text-2xl font-mono font-bold max-w-lg bg-black/50 p-6 rounded-xl">
            UNAUTHORIZED TRANSFER QUARANTINED. IMMEDIATE INVESTIGATION REQUIRED.
          </p>
          <button 
            onClick={stopSiren}
            className="mt-12 px-8 py-4 bg-black/30 border-2 border-white/50 text-white font-mono text-xl"
          >
            MUTE SIREN
          </button>
        </div>
      ) : (
        <div>
          <div className="w-8 h-8 rounded-full bg-teal mb-8 mx-auto animate-pulse"></div>
          <h1 className="text-2xl font-mono tracking-widest text-teal-muted">SYSTEM SECURE</h1>
          <p className="text-ink-muted font-mono mt-4">Monitoring for incoming quarantine alerts...</p>
        </div>
      )}
    </div>
  );
}
