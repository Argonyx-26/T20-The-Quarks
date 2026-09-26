import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMissionControlData } from "../hooks/useMissionControlData";
import { TopCommandRail } from "../components/TopCommandRail";
import { ConnectionBanner, DegradedSourcesBanner } from "../components/ConnectionBanner";
import { DeviceTopology } from "../components/DeviceTopology";
import { EventStream } from "../components/EventStream";
import { SourceHealthPanel } from "../components/SourceHealthPanel";
import { ActiveIncidentPanel } from "../components/ActiveIncidentPanel";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { CorrelationBasis } from "../components/CorrelationBasis";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { OperatorConsole } from "../components/OperatorConsole";
import { DevPreviewSwitcher } from "../components/DevPreviewSwitcher";
import type { IncidentStatus, NormalizedEvent } from "../domain";

export default function MissionControl() {
  const mc = useMissionControlData();
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useMemo(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const snapshot = mc.snapshot;

  const selectedIncident = useMemo(() => {
    if (!snapshot || snapshot.incidents.length === 0) return null;
    const byId = selectedIncidentId ? snapshot.incidents.find((i) => i.incidentId === selectedIncidentId) : null;
    if (byId) return byId;
    const open = snapshot.incidents.filter((i) => i.status === "open");
    const pool = open.length > 0 ? open : snapshot.incidents;
    return [...pool].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))[0] ?? null;
  }, [snapshot, selectedIncidentId]);

  const handleSetStatus = (incidentId: string, status: IncidentStatus) => {
    mc.setIncidentStatus(incidentId, status);
  };

  if (mc.status === "booting") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-800">
        <div className="flex flex-col items-center gap-3">
          <span className="font-mono text-[13px] tracking-[0.14em] text-ink-faint">SENTRIX</span>
          <span className="text-[11px] text-ink-faint">Establishing realtime session…</span>
        </div>
        <DevPreviewSwitcher current={mc.previewKey} />
      </div>
    );
  }

  if (mc.status === "error") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-800">
        <div className="flex max-w-[380px] flex-col items-center gap-3 text-center">
          <span className="h-2 w-2 rounded-full bg-status-critical" />
          <p className="text-[15px] font-semibold tracking-wide text-ink">BACKEND UNAVAILABLE</p>
          <p className="text-[12.5px] text-ink-faint">Mission Control could not reach the SENTRIX backend{mc.error ? ` (${mc.error})` : ""}.</p>
          {!mc.previewKey && (
            <button
              onClick={() => mc.reload()}
              className="mt-1 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink-muted hover:border-ink-faint hover:text-ink"
            >
              Retry
            </button>
          )}
          <Link to="/" className="mt-2 text-[11.5px] text-ink-faint hover:text-ink">
            ← Back to overview
          </Link>
        </div>
        <DevPreviewSwitcher current={mc.previewKey} />
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base-800 text-ink">
      <TopCommandRail snapshot={snapshot} previewKey={mc.previewKey} />
      <ConnectionBanner realtimeStatus={snapshot.realtimeStatus} />
      <DegradedSourcesBanner sourceHealth={snapshot.sourceHealth} />

      <main className="grid min-h-0 flex-1 grid-rows-[1.15fr_1fr] gap-2 overflow-hidden p-2">
        <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1.15fr_1fr_0.65fr]">
          <DeviceTopology
            devices={snapshot.devices}
            incidents={snapshot.incidents}
            lastEvaluation={snapshot.lastEvaluation}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            highlightedDeviceId={hoveredDeviceId}
            now={now}
          />
          <ActiveIncidentPanel
            incidents={snapshot.incidents}
            selected={selectedIncident}
            onSelect={(i) => setSelectedIncidentId(i.incidentId)}
            onSetStatus={handleSetStatus}
            justUpdatedId={mc.justUpdatedIncidentId}
            lastEvaluation={snapshot.lastEvaluation}
            sourcesOnline={snapshot.sourceHealth.filter((h) => h.status === "online").length}
            totalEvents={snapshot.events.length}
          />
          <SourceHealthPanel sourceHealth={snapshot.sourceHealth} />
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1.3fr_1fr]">
          <EventStream
            events={snapshot.events}
            incidents={snapshot.incidents}
            onSelect={setSelectedEvent}
            selectedId={selectedEvent?.eventId ?? null}
            onHoverDevice={setHoveredDeviceId}
          />
          <div className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <IncidentTimeline incident={selectedIncident} />
            <CorrelationBasis
              incident={selectedIncident}
              lastEvaluation={selectedIncident ? undefined : snapshot.lastEvaluation}
              events={snapshot.events}
              onSelectEvent={setSelectedEvent}
            />
          </div>
        </div>
      </main>

      <OperatorConsole
        scenarios={mc.scenarios}
        previewKey={mc.previewKey}
        actionError={mc.actionError}
        onRunScenario={mc.runScenario}
        onRunMismatchScenario={mc.runMismatchScenario}
        onResetScenario={mc.resetScenario}
      />
      <DevPreviewSwitcher current={mc.previewKey} />

      {selectedEvent && <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
