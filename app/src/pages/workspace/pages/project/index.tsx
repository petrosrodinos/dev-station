import type { FC } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ProjectTabOptions, ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { RequirePermission } from "@/components/access/require-permission";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "./hooks/use-project-context";
import OverviewTab from "./pages/overview";
import GitTab from "./pages/git";
import FilesTab from "./pages/files";
import TerminalTab from "./pages/terminal";
import SessionsTab from "./pages/sessions";
import SkillsTab from "./pages/skills";
import IntegrationsTab from "./pages/integrations";

const TAB_PAGES: Record<ProjectTab, FC> = {
  [ProjectTabs.OVERVIEW]: OverviewTab,
  [ProjectTabs.GIT]: GitTab,
  [ProjectTabs.FILES]: FilesTab,
  [ProjectTabs.TERMINAL]: TerminalTab,
  [ProjectTabs.SESSIONS]: SessionsTab,
  [ProjectTabs.SKILLS]: SkillsTab,
  [ProjectTabs.INTEGRATIONS]: IntegrationsTab,
};

const ProjectTabPage: FC = () => {
  const { tab } = useParams();
  const project = useProjectContext();
  const id = (tab ?? ProjectTabs.OVERVIEW) as ProjectTab;
  const Page = TAB_PAGES[id];
  if (!Page) return <Navigate to={Routes.workspace.project(project.id)} replace />;
  const permission = ProjectTabOptions.find((t) => t.id === id)?.permission;
  if (!permission) return <Page />;
  return (
    <RequirePermission permission={permission} redirectTo={Routes.workspace.project(project.id)}>
      <Page />
    </RequirePermission>
  );
};

export default ProjectTabPage;
