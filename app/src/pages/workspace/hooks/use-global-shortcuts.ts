import { useEffect, useMemo, useRef } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useDialogsStore } from "@/stores/dialogs";
import { useWorkspaceStore } from "@/stores/workspace";
import { useShortcutsStore } from "@/stores/shortcuts";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { CustomShortcutTypes } from "@/features/users/interfaces/users.interfaces";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { SettingsSections } from "@/config/constants/dropdowns/settings/settings-section.options";
import { buildComboIndex, eventToCombo } from "@/lib/shortcuts.utils";
import { jumpToAttentionSession } from "@/lib/session-navigation.utils";
import { projectRouteKeepingTab } from "@/lib/project-route.utils";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { createTerminal } from "@/features/terminals/services/terminals.services";
import { useRuntimeStore } from "@/stores/runtime";
import { toast } from "@/hooks/use-toast";
import { isDesktop } from "@/lib/desktop";
import { Routes } from "@/routes/routes";

interface ActionContext {
  navigate: NavigateFunction;
  projects: Project[] | undefined;
  can: ReturnType<typeof usePermissions>["can"];
}

const cycleSessionTab = (direction: 1 | -1): boolean => {
  const ws = useWorkspaceStore.getState();
  const tabs = ws.open_session_tabs;
  if (!tabs.length) return false;
  const idx = Math.max(0, tabs.indexOf(ws.active_session_id ?? ""));
  ws.openSessionTab(tabs[(idx + direction + tabs.length) % tabs.length]);
  return true;
};

const openNewSession = (ctx: ActionContext, initialPrompt: string | null = null): boolean => {
  if (ctx.can(PermissionKeys.AI_START_AGENTS)) {
    useDialogsStore.getState().openNewSession({ project_id: useWorkspaceStore.getState().active_project_id, initial_prompt: initialPrompt });
  }
  return true;
};

/** Opens a shell in the active project and shows the terminal tab. */
const openNewTerminal = (ctx: ActionContext): boolean => {
  const projectId = useWorkspaceStore.getState().active_project_id;
  if (!projectId || !isDesktop() || !ctx.can(PermissionKeys.PROJECTS_EDIT)) return false;
  createTerminal({ projectId })
    .then((info) => {
      useRuntimeStore.getState().upsertTerminal(info);
      ctx.navigate(Routes.workspace.project_tab(projectId, ProjectTabs.TERMINAL));
    })
    .catch((error: Error) => toast({ title: "Could not open terminal", description: error.message, variant: "error" }));
  return true;
};

/** Runs a built-in action. Returns false when it does not apply right now, so the key press is left alone. */
const runShortcutAction = (actionId: string, ctx: ActionContext): boolean => {
  const dialogs = useDialogsStore.getState();
  const ws = useWorkspaceStore.getState();

  switch (actionId) {
    case ShortcutActions.COMMAND_PALETTE:
      dialogs.setCommandPalette(!dialogs.command_palette);
      return true;
    case ShortcutActions.NEW_SESSION:
      return openNewSession(ctx);
    case ShortcutActions.NEW_TERMINAL:
      return openNewTerminal(ctx);
    case ShortcutActions.TOGGLE_AI_PANEL:
      if (ctx.can(PermissionKeys.AI_USE_AGENTS)) ws.setAiPanelOpen(!ws.ai_panel_open);
      return true;
    case ShortcutActions.NEXT_SESSION_TAB:
      return cycleSessionTab(1);
    case ShortcutActions.PREV_SESSION_TAB:
      return cycleSessionTab(-1);
    case ShortcutActions.GO_TO_FINISHED_SESSION:
      return jumpToAttentionSession(ctx.navigate);
    case ShortcutActions.TOGGLE_PREVIEW: {
      const id = ws.active_project_id;
      if (!id) return false;
      ws.setProjectPreview(id, { previewOpen: !ws.preview_by_project[id]?.previewOpen });
      return true;
    }
    case ShortcutActions.OPEN_SETTINGS:
      ctx.navigate(Routes.workspace.settings_section(SettingsSections.GENERAL));
      return true;
    case ShortcutActions.OPEN_INTEGRATIONS:
      ctx.navigate(Routes.workspace.integrations);
      return true;
    case ShortcutActions.ADD_PROJECT:
      dialogs.openProjectDialog(null);
      return true;
    default: {
      const match = /^switch_project_([1-9])$/.exec(actionId);
      const project = match ? ctx.projects?.[Number(match[1]) - 1] : undefined;
      if (!project) return false;
      ws.setActiveProject(project.id);
      ctx.navigate(projectRouteKeepingTab(project.id, window.location.pathname));
      return true;
    }
  }
};

/** Dispatches the user's effective shortcuts (defaults, overrides and custom ones) on Ctrl/⌘ key presses. */
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();
  const { data: projects } = useGetProjects();
  const { can } = usePermissions();
  const canRef = useRef(can);
  canRef.current = can;
  const shortcuts = useResolvedShortcuts();
  const index = useMemo(() => buildComboIndex(shortcuts), [shortcuts]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (useShortcutsStore.getState().suspended > 0) return;
      const combo = eventToCombo(e);
      const shortcut = combo ? index.get(combo) : undefined;
      if (!shortcut) return;

      const ctx: ActionContext = { navigate, projects, can: canRef.current };
      let handled = false;
      if (shortcut.kind === "custom" && shortcut.custom) {
        const { custom } = shortcut;
        if (custom.type === CustomShortcutTypes.AI_PROMPT) handled = openNewSession(ctx, custom.prompt ?? null);
        else if (custom.action_id) handled = runShortcutAction(custom.action_id, ctx);
      } else if (shortcut.action_id && shortcut.rebindable) {
        handled = runShortcutAction(shortcut.action_id, ctx);
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, navigate, projects]);
};
