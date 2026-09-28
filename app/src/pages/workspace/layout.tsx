import type { FC } from "react";
import { Outlet } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { OrganizationBootstrap } from "@/components/providers/organization-bootstrap";
import { DesktopEventsProvider } from "@/components/providers/desktop-events-provider";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAppearanceHydration } from "@/features/users/hooks/use-appearance";
import { useShortcutsHydration } from "@/features/users/hooks/use-shortcuts";
import { useAccessSync } from "@/hooks/use-access-sync";
import { TopBar } from "./components/top-bar";
import { SessionTabStrip } from "./components/session-tab-strip";
import { ProjectRail } from "./components/project-rail";
import { AiPanel } from "./components/ai-panel";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { StatusBar } from "./components/status-bar";
import { CommandPalette } from "./components/command-palette";
import { NewSessionDialog } from "./components/new-session-dialog";
import { ProjectDialog } from "./components/project-dialog";
import { ShortcutsPracticeDialog } from "./components/shortcuts-practice-dialog";
import { useGlobalShortcuts } from "./hooks/use-global-shortcuts";

/**
 * Desktop workspace shell (Spec §4):
 * top bar · global AI session tabs · project rail | project workspace | AI/terminal panel · status bar.
 */
const WorkspaceLayout: FC = () => {
  useAccessSync();
  const { can } = usePermissions();
  const aiPanelOpen = useWorkspaceStore((s) => s.ai_panel_open) && can(PermissionKeys.AI_USE_AGENTS);
  useGlobalShortcuts();
  useAppearanceHydration();
  useShortcutsHydration();

  return (
    <OrganizationBootstrap>
      <DesktopEventsProvider />
      <div className="flex h-screen flex-col bg-canvas text-foreground">
        <TopBar />
        <SessionTabStrip />
        <div className="flex min-h-0 flex-1">
          <ProjectRail />
          <ResizablePanelGroup orientation="horizontal" className="min-w-0 flex-1">
            <ResizablePanel id="workspace" minSize={480}>
              <main className="flex h-full min-w-0 flex-col">
                <Outlet />
              </main>
            </ResizablePanel>
            {aiPanelOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel id="ai-panel" minSize={320} maxSize={760} defaultSize={420}>
                  <AiPanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
        <StatusBar />
      </div>
      <CommandPalette />
      <NewSessionDialog />
      <ProjectDialog />
      <ShortcutsPracticeDialog />
    </OrganizationBootstrap>
  );
};

export default WorkspaceLayout;
