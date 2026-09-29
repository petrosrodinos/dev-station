import type { FC } from "react";
import { OrganizationBootstrap } from "@/components/providers/organization-bootstrap";
import { DesktopEventsProvider } from "@/components/providers/desktop-events-provider";
import { useAppearanceHydration } from "@/features/users/hooks/use-appearance";
import { useShortcutsHydration } from "@/features/users/hooks/use-shortcuts";
import { useLayoutHydration } from "@/features/workspace-layouts/hooks/use-layout-persistence";
import { useFloatingPanelsSync } from "@/features/workspace-layouts/hooks/use-floating-panels-sync";
import { useAccessSync } from "@/hooks/use-access-sync";
import { TopBar } from "./components/top-bar";
import { ProjectRail } from "./components/project-rail";
import { WorkspaceDock } from "./components/dock/workspace-dock";
import { DockApiProvider } from "./context/dock-api-provider";
import { StatusBar } from "./components/status-bar";
import { CommandPalette } from "./components/command-palette";
import { NewSessionDialog } from "./components/new-session-dialog";
import { ProjectDialog } from "./components/project-dialog";
import { ShortcutsPracticeDialog } from "./components/shortcuts-practice-dialog";
import { useGlobalShortcuts } from "./hooks/use-global-shortcuts";
import { useSessionGroups } from "./hooks/use-session-groups";
import { useProjectSessionMemory } from "./hooks/use-project-session-memory";

/**
 * Desktop workspace shell (Spec §4):
 * top bar · project rail | project workspace | AI panel (sessions grouped by project + review) · status bar.
 */
const WorkspaceLayout: FC = () => {
  useAccessSync();
  const sessionGroups = useSessionGroups();
  useGlobalShortcuts(sessionGroups);
  useProjectSessionMemory(sessionGroups);
  useAppearanceHydration();
  useShortcutsHydration();
  useLayoutHydration();
  useFloatingPanelsSync();

  return (
    <OrganizationBootstrap>
      <DesktopEventsProvider />
      <DockApiProvider>
        <div className="flex h-screen flex-col bg-canvas text-foreground">
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <ProjectRail />
            <WorkspaceDock />
          </div>
          <StatusBar />
        </div>
      </DockApiProvider>
      <CommandPalette />
      <NewSessionDialog />
      <ProjectDialog />
      <ShortcutsPracticeDialog />
    </OrganizationBootstrap>
  );
};

export default WorkspaceLayout;
