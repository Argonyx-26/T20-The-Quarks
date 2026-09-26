import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import MissionControl from "./pages/MissionControl";
import IncidentDetail from "./pages/IncidentDetail";
import SirenAlert from "./pages/SirenAlert";

import { MissionControlProvider } from "./MissionControlContext";

export default function App() {
  return (
    <MissionControlProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/mission-control" element={<MissionControl />} />
          <Route path="/incident/:incidentId" element={<IncidentDetail />} />
          <Route path="/siren" element={<SirenAlert />} />
        </Routes>
      </BrowserRouter>
    </MissionControlProvider>
  );
}
