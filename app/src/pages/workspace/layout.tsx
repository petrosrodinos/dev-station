import type { FC } from "react";
import { OrganizationBootstrap } from "@/components/providers/organization-bootstrap";
import { DesktopEventsProvider } from "@/components/providers/desktop-events-provider";
import { useAppearanceHydration } from "@/features/users/hooks/use-appearance";
import { useShortcutsHydration } from "@/features/users/hooks/use-shortcuts";
import { useLayoutHydration } from "@/features/workspace-layouts/hooks/use-layout-persistence";
import { useFloatingPanelsSync } from "@/features/workspace-layouts/hooks/use-floating-panels-sync";
import { useAccessSync } from "@/hooks/use-access-sync";
import { OfflineBanner } from "./components/offline-banner";
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
import { useOpenSessions } from "./hooks/use-open-sessions";
import type { RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { useRailPosition } from "@/features/users/hooks/use-rail-position";
import { cn } from "@/lib/utils";
import { useProjectSessionMemory } from "./hooks/use-project-session-memory";

/** The rail stays first in the DOM; flex direction moves it to the chosen edge. */
const RAIL_FLEX: Record<RailPosition, string> = {
  left: "flex-row",
  right: "flex-row-reverse",
  top: "flex-col",
  bottom: "flex-col-reverse",
};

/**
 * Desktop workspace shell (Spec §4):
 * top bar · project rail | project workspace | AI panel (open sessions + review) · status bar.
 */
const WorkspaceLayout: FC = () => {
  useAccessSync();
  const openSessions = useOpenSessions();
  useGlobalShortcuts(openSessions);
  useProjectSessionMemory(openSessions);
  useAppearanceHydration();
  useShortcutsHydration();
  useLayoutHydration();
  useFloatingPanelsSync();
  const { position: railPosition } = useRailPosition();

  return (
    <OrganizationBootstrap>
      <DesktopEventsProvider />
      <DockApiProvider>
        <div className="flex h-screen flex-col bg-canvas text-foreground">
          <OfflineBanner />
          <TopBar />
          <div className={cn("flex min-h-0 flex-1", RAIL_FLEX[railPosition])}>
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
