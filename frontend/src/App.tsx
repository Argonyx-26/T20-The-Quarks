import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import MissionControl from "./pages/MissionControl";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/mission-control" element={<MissionControl />} />
      </Routes>
    </BrowserRouter>
  );
}
