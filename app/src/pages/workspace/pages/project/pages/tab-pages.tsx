import type { FC } from "react";
import { ProjectTabOptions, ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import OverviewTab from "./overview";
import GitTab from "./git";
import FilesTab from "./files";
import TerminalTab from "./terminal";
import SessionsTab from "./sessions";
import SkillsTab from "./skills";
import IntegrationsTab from "./integrations";

/** Shared by the routed `ProjectTabPage` and the dockable `ProjectTabDock` (Phase 2 of the docking system). */
export const TAB_PAGES: Record<ProjectTab, FC> = {
  [ProjectTabs.OVERVIEW]: OverviewTab,
  [ProjectTabs.GIT]: GitTab,
  [ProjectTabs.FILES]: FilesTab,
  [ProjectTabs.TERMINAL]: TerminalTab,
  [ProjectTabs.SESSIONS]: SessionsTab,
  [ProjectTabs.SKILLS]: SkillsTab,
  [ProjectTabs.INTEGRATIONS]: IntegrationsTab,
};

export const tabPermission = (id: ProjectTab) => ProjectTabOptions.find((t) => t.id === id)?.permission;
