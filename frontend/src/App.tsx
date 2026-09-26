import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import MissionControl from "./pages/MissionControl";
import IncidentDetail from "./pages/IncidentDetail";
import PairDevice from "./pages/PairDevice";
import { PhonePaired } from "./pages/PhonePaired";

import { MissionControlProvider } from "./MissionControlContext";

/**
 * /pair/:token and /phone are deliberately OUTSIDE MissionControlProvider:
 * a phone must never open the mission_control-role realtime connection or
 * fetch the full snapshot -- it only ever gets its own authenticated
 * paired_device channel (see hooks/useDeviceConnection.ts). Putting them
 * inside the provider would silently grant a phone the same realtime
 * access as the operator's own Mission Control tab.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pair/:token" element={<PairDevice />} />
        <Route path="/phone" element={<PhonePaired />} />
        <Route
          path="/*"
          element={
            <MissionControlProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/mission-control" element={<MissionControl />} />
                <Route path="/incident/:incidentId" element={<IncidentDetail />} />
              </Routes>
            </MissionControlProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
