import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import MissionControl from "./pages/MissionControl";
import IncidentDetail from "./pages/IncidentDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/mission-control" element={<MissionControl />} />
        <Route path="/incident/:incidentId" element={<IncidentDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
