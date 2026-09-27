import type { FC } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "./hooks/use-project-context";
import OverviewTab from "./pages/overview";
import GitTab from "./pages/git";
import FilesTab from "./pages/files";
import TerminalTab from "./pages/terminal";
import SessionsTab from "./pages/sessions";
import LinearTab from "./pages/linear";
import NotionTab from "./pages/notion";

const TAB_PAGES: Record<ProjectTab, FC> = {
  [ProjectTabs.OVERVIEW]: OverviewTab,
  [ProjectTabs.GIT]: GitTab,
  [ProjectTabs.FILES]: FilesTab,
  [ProjectTabs.TERMINAL]: TerminalTab,
  [ProjectTabs.SESSIONS]: SessionsTab,
  [ProjectTabs.LINEAR]: LinearTab,
  [ProjectTabs.NOTION]: NotionTab,
};

const ProjectTabPage: FC = () => {
  const { tab } = useParams();
  const project = useProjectContext();
  const Page = TAB_PAGES[(tab ?? ProjectTabs.OVERVIEW) as ProjectTab];
  if (!Page) return <Navigate to={Routes.workspace.project(project.id)} replace />;
  return <Page />;
};

export default ProjectTabPage;
