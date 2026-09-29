import { useMemo, useState, type FC, type ReactNode } from "react";
import type { DockviewApi } from "dockview-react";
import { DockApiContext } from "./dock-api-context";

export const DockApiProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const value = useMemo(() => ({ api, setApi }), [api]);
  return <DockApiContext.Provider value={value}>{children}</DockApiContext.Provider>;
};
