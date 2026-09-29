import type { FC } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { RequirePermission } from "@/components/access/require-permission";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "./hooks/use-project-context";
import { TAB_PAGES, tabPermission } from "./pages/tab-pages";

/**
 * Retained as the route target for `:tab` so deep links keep working, but `ProjectLayout` no
 * longer renders this via `<Outlet/>` — the body area renders `ProjectTabDock` instead (Phase 2
 * of the docking system: project tab pages became dockable views, see `project-tab-dock.tsx`).
 */
const ProjectTabPage: FC = () => {
  const { tab } = useParams();
  const project = useProjectContext();
  const id = (tab ?? ProjectTabs.OVERVIEW) as ProjectTab;
  const Page = TAB_PAGES[id];
  if (!Page) return <Navigate to={Routes.workspace.project(project.id)} replace />;
  const permission = tabPermission(id);
  if (!permission) return <Page />;
  return (
    <RequirePermission permission={permission} redirectTo={Routes.workspace.project(project.id)}>
      <Page />
    </RequirePermission>
  );
};

export default ProjectTabPage;
