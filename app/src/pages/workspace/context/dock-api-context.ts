import { createContext, useContext } from "react";
import type { DockviewApi } from "dockview-react";

/** Shares the workspace dock root's live `DockviewApi` with chrome outside the dock (e.g. the top bar's Layout menu). */
export const DockApiContext = createContext<{ api: DockviewApi | null; setApi: (api: DockviewApi | null) => void } | null>(null);

export const useDockApi = () => {
  const ctx = useContext(DockApiContext);
  if (!ctx) throw new Error("useDockApi must be used within a DockApiProvider");
  return ctx;
};
