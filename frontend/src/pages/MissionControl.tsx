import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMissionControlContext } from "../MissionControlContext";
import { CommandRail } from "../components/CommandRail";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { NetworkField } from "../components/NetworkField";
import { EventStream } from "../components/EventStream";
import { SensorHealthPanel } from "../components/SensorHealthPanel";
import { IncidentPanel } from "../components/IncidentPanel";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { ReasoningPanel } from "../components/ReasoningPanel";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { DemoControls } from "../components/DemoControls";
import { TransferDashboard } from "../components/TransferDashboard";
import type { IncidentStatus, SentrixEvent } from "../types";

export default function MissionControl() {
  const mc = useMissionControlContext();
  const [selectedEvent, setSelectedEvent] = useState<SentrixEvent | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"LIVE" | "REPLAY">("LIVE");
  const [now, setNow] = useState(() => Date.now());

  useMemo(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
  const deviceCount = useMemo(() => new Set(mc.events.map((e) => e.asset_id)).size, [mc.events]);

  const handleReplay = async (scenario: string) => {
    setMode("REPLAY");
    await mc.replay(scenario);
  };

  const handleReset = async () => {
    setMode("LIVE");
    setSelectedIncidentId(null);
    setSelectedEvent(null);
    setSelectedAssetId(null);
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
          <span className="text-[11px] text-ink-faint">Establishing realtime session…</span>
        </div>
      </div>
    );
  }

  if (mc.loadError && mc.events.length === 0 && mc.incidents.length === 0 && !mc.health) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-800">
        <div className="flex max-w-[380px] flex-col items-center gap-3 text-center">
          <span className="h-2 w-2 rounded-full bg-status-critical" />
          <p className="text-[15px] font-semibold text-ink">Mission Control unavailable</p>
          <p className="text-[12.5px] text-ink-faint">Backend connection failed ({mc.loadError}).</p>
          <button
            onClick={() => mc.reload()}
            className="mt-1 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-ink-muted hover:border-ink-faint hover:text-ink"
          >
            Retry
          </button>
          <Link to="/" className="mt-2 text-[11.5px] text-ink-faint hover:text-ink">
            ← Back to overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base-800 text-ink">
      <CommandRail
        health={mc.health}
        connState={mc.connState}
        mode={mode}
        deviceCount={deviceCount}
        eventCount={mc.events.length}
        openIncidentCount={openIncidents.length}
        maxSeverityOpen={maxSeverityOpen}
      />
      <ConnectionBanner connState={mc.connState} />

      <main className="grid min-h-0 flex-1 grid-rows-[1.15fr_1fr] gap-2 overflow-hidden p-2">
        {/* upper: topology (dominant) | incident (focal) | source health */}
        <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1.15fr_1fr_0.65fr]">
          <NetworkField
            events={mc.events}
            incidents={mc.incidents}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
            now={now}
          />
          <IncidentPanel
            incidents={mc.incidents}
            selected={selectedIncident}
            onSelect={(i) => setSelectedIncidentId(i.incident_id)}
            onSetStatus={handleSetStatus}
            justUpdatedId={mc.justUpdatedIncidentId}
            totalEvents={mc.events.length}
            sensorsSeen={sensorsSeen}
          />
          <SensorHealthPanel health={mc.health} />
        </div>

        {/* lower: transfer dashboard | event stream | timeline + reasoning */}
        <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1fr_1.3fr_1fr]">
          <TransferDashboard transfers={mc.transfers} online={mc.connState === "live"} />
          <EventStream events={mc.events} onSelect={setSelectedEvent} selectedId={selectedEvent?.event_id ?? null} />
          <div className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <IncidentTimeline incident={selectedIncident} />
            <ReasoningPanel incident={selectedIncident} events={mc.events} onSelectEvent={setSelectedEvent} />
          </div>
        </div>
      </main>

      <DemoControls scenarios={mc.scenarios} onReplay={handleReplay} onReset={handleReset} />

      {selectedEvent && <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
