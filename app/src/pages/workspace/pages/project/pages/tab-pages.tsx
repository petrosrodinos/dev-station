import type { FC } from "react";
import { Bot, BookOpen, Files, GitBranch, Home, Plug, SquareTerminal, type LucideIcon } from "lucide-react";
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

/** Shared with `ProjectTabDock`'s custom tab renderer so the dock's own tab strip looks like the rest of the app. */
export const TAB_ICONS: Record<ProjectTab, LucideIcon> = {
  [ProjectTabs.OVERVIEW]: Home,
  [ProjectTabs.GIT]: GitBranch,
  [ProjectTabs.FILES]: Files,
  [ProjectTabs.TERMINAL]: SquareTerminal,
  [ProjectTabs.SESSIONS]: Bot,
  [ProjectTabs.SKILLS]: BookOpen,
  [ProjectTabs.INTEGRATIONS]: Plug,
};

export const tabPermission = (id: ProjectTab) => ProjectTabOptions.find((t) => t.id === id)?.permission;
