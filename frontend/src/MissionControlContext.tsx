import { createContext, useContext, ReactNode } from "react";
import { useMissionControl, MissionControlState } from "./useMissionControl";

const MissionControlContext = createContext<MissionControlState | null>(null);

export function MissionControlProvider({ children }: { children: ReactNode }) {
  const state = useMissionControl();
  return (
    <MissionControlContext.Provider value={state}>
      {children}
    </MissionControlContext.Provider>
  );
}

export function useMissionControlContext() {
  const ctx = useContext(MissionControlContext);
  if (!ctx) throw new Error("Missing MissionControlProvider");
  return ctx;
}
