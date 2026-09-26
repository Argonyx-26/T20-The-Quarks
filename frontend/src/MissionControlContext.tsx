import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMissionControlData, type MissionControlData } from "./hooks/useMissionControlData";
import { deriveTransfers } from "./services/missionControlApi";
import type { Transfer } from "./domain";

export interface MissionControlContextValue extends MissionControlData {
  transfers: Transfer[];
}

const MissionControlContext = createContext<MissionControlContextValue | null>(null);

/**
 * Single shared connection for the whole app -- Landing (LiveTransfersWidget)
 * and Mission Control both read from here so navigating between them
 * doesn't open a second WebSocket to the backend.
 */
export function MissionControlProvider({ children }: { children: ReactNode }) {
  const data = useMissionControlData();
  const transfers = useMemo(() => deriveTransfers(data.snapshot?.events ?? []), [data.snapshot?.events]);

  const value = useMemo(() => ({ ...data, transfers }), [data, transfers]);

  return <MissionControlContext.Provider value={value}>{children}</MissionControlContext.Provider>;
}

export function useMissionControlContext(): MissionControlContextValue {
  const ctx = useContext(MissionControlContext);
  if (!ctx) throw new Error("Missing MissionControlProvider");
  return ctx;
}
