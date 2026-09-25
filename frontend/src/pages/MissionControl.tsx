import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMissionControl } from "../useMissionControl";
import { TopStatusBar } from "../components/TopStatusBar";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { EventStream } from "../components/EventStream";
import { SensorHealthPanel } from "../components/SensorHealthPanel";
import { IncidentPanel } from "../components/IncidentPanel";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { ReasoningPanel } from "../components/ReasoningPanel";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { DemoControls } from "../components/DemoControls";
import { GridField } from "../components/GridField";
import type { IncidentStatus, SentrixEvent } from "../types";

export default function MissionControl() {
  const mc = useMissionControl();
  const [selectedEvent, setSelectedEvent] = useState<SentrixEvent | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [mode, setMode] = useState<"LIVE" | "REPLAY">("LIVE");

  const selectedIncident = useMemo(() => {
    if (mc.incidents.length === 0) return null;
    const byId = selectedIncidentId ? mc.incidents.find((i) => i.incident_id === selectedIncidentId) : null;
    if (byId) return byId;
    const open = mc.incidents.filter((i) => i.status === "OPEN");
    const pool = open.length > 0 ? open : mc.incidents;
    return [...pool].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
  }, [mc.incidents, selectedIncidentId]);

  const openIncidents = mc.incidents.filter((i) => i.status === "OPEN");
  const maxSeverityOpen = openIncidents.reduce((m, i) => Math.max(m, i.severity), 0);
  const sensorsSeen = mc.health
    ? Object.values(mc.health.sensors).filter((s) => s.status !== "never_seen").length
    : 0;

  const handleReplay = async (scenario: string) => {
    setMode("REPLAY");
    await mc.replay(scenario);
  };

  const handleReset = async () => {
    setMode("LIVE");
    setSelectedIncidentId(null);
    setSelectedEvent(null);
    await mc.reset();
  };

  const handleSetStatus = (incidentId: string, status: IncidentStatus) => {
    mc.setIncidentStatus(incidentId, status);
  };

  if (mc.loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-800">
        <div className="flex flex-col items-center gap-3">
          <span className="font-mono text-[13px] tracking-[0.14em] text-ink-faint">SENTRIX</span>
          <span className="text-[11px] text-ink-faint">Connecting to fusion backend…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base-800 text-ink">
      <TopStatusBar
        health={mc.health}
        connState={mc.connState}
        mode={mode}
        openIncidentCount={openIncidents.length}
        maxSeverityOpen={maxSeverityOpen}
      />
      <ConnectionBanner connState={mc.connState} />
      {mc.loadError && mc.events.length === 0 && mc.incidents.length === 0 && (
        <div className="flex shrink-0 items-center justify-between border-b border-status-critical/30 bg-status-critical/10 px-3 py-1.5 text-[11.5px] text-status-critical">
          <span>Could not reach SENTRIX backend at startup ({mc.loadError}).</span>
          <button onClick={() => mc.reload()} className="rounded-sm border border-status-critical/40 px-2 py-0.5 hover:bg-status-critical/20">
            Retry
          </button>
        </div>
      )}

      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden p-2 lg:grid-cols-[minmax(0,0.85fr)_14px_minmax(0,1.15fr)]">
        <GridField className="opacity-40" />
        <div className="relative flex min-h-0 flex-col gap-2">
          <EventStream events={mc.events} onSelect={setSelectedEvent} selectedId={selectedEvent?.event_id ?? null} />
          <div className="h-[168px] shrink-0">
            <SensorHealthPanel health={mc.health} />
          </div>
        </div>

        <div className="relative hidden lg:block" aria-hidden="true">
          <div
            className={`absolute left-1/2 top-6 h-[calc(100%-96px)] w-px -translate-x-1/2 transition-colors duration-context ${
              openIncidents.length > 0 ? "bg-amber/60" : "bg-line"
            }`}
          />
          <div
            className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ${
              openIncidents.length > 0 ? "bg-amber" : "bg-line"
            }`}
          />
        </div>

        <div className="relative flex min-h-0 flex-col gap-2">
          <div className="h-[300px] shrink-0">
            <IncidentPanel
              incidents={mc.incidents}
              selected={selectedIncident}
              onSelect={(i) => setSelectedIncidentId(i.incident_id)}
              onSetStatus={handleSetStatus}
              justUpdatedId={mc.justUpdatedIncidentId}
              totalEvents={mc.events.length}
              sensorsSeen={sensorsSeen}
            />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
            <IncidentTimeline incident={selectedIncident} />
            <ReasoningPanel incident={selectedIncident} events={mc.events} onSelectEvent={setSelectedEvent} />
          </div>
        </div>
      </main>

      <Link
        to="/"
        className="fixed bottom-3 left-3 z-10 rounded-sm border border-line bg-base-700 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-faint hover:border-ink-faint hover:text-ink"
      >
        ← OVERVIEW
      </Link>

      <DemoControls scenarios={mc.scenarios} onReplay={handleReplay} onReset={handleReset} />

      {selectedEvent && <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
