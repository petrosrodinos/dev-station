import { createContext, useContext } from "react";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";

/**
 * The project resolved by ProjectLayout, shared with every project tab. A plain context (not
 * `useOutletContext`) so tab pages also work when rendered directly inside a dock panel
 * (`ProjectTabDock`), not only through the router's `<Outlet/>`.
 */
export const ProjectContext = createContext<Project | null>(null);

export const useProjectContext = () => {
  const project = useContext(ProjectContext);
  if (!project) throw new Error("useProjectContext must be used within a ProjectLayout");
  return project;
};
