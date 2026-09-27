import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDialogsStore } from "@/stores/dialogs";
import { useWorkspaceStore } from "@/stores/workspace";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { Routes } from "@/routes/routes";

/**
 * Keyboard shortcuts (Spec §34 Phase 7):
 * Ctrl/⌘+K command palette · Ctrl/⌘+1…9 switch project · Ctrl/⌘+T new AI session ·
 * Ctrl/⌘+J toggle AI panel · Ctrl/⌘+Tab / Shift+Ctrl/⌘+Tab cycle session tabs.
 */
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();
  const { data: projects } = useGetProjects();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const dialogs = useDialogsStore.getState();
      const ws = useWorkspaceStore.getState();
      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        dialogs.setCommandPalette(!dialogs.command_palette);
      } else if (key === "t" && !e.shiftKey) {
        e.preventDefault();
        dialogs.openNewSession({ project_id: ws.active_project_id });
      } else if (key === "j") {
        e.preventDefault();
        ws.setAiPanelOpen(!ws.ai_panel_open);
      } else if (e.key === "Tab" && ws.open_session_tabs.length) {
        e.preventDefault();
        const tabs = ws.open_session_tabs;
        const idx = Math.max(0, tabs.indexOf(ws.active_session_id ?? ""));
        const next = tabs[(idx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length];
        ws.openSessionTab(next);
      } else if (/^[1-9]$/.test(e.key) && projects?.length) {
        const project = projects[Number(e.key) - 1];
        if (project) {
          e.preventDefault();
          ws.setActiveProject(project.id);
          navigate(Routes.workspace.project(project.id));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, projects]);
};
