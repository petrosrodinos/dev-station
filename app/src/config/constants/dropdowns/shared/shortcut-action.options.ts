import { CustomShortcutTypes, type CustomShortcutType } from "@/features/users/interfaces/users.interfaces";

export const ShortcutActions = {
  COMMAND_PALETTE: "command_palette",
  NEW_SESSION: "new_session",
  TOGGLE_AI_PANEL: "toggle_ai_panel",
  NEXT_SESSION_TAB: "next_session_tab",
  PREV_SESSION_TAB: "prev_session_tab",
  TOGGLE_PREVIEW: "toggle_preview",
  OPEN_SETTINGS: "open_settings",
  OPEN_INTEGRATIONS: "open_integrations",
  ADD_PROJECT: "add_project",
  SWITCH_PROJECT_1: "switch_project_1",
  SWITCH_PROJECT_2: "switch_project_2",
  SWITCH_PROJECT_3: "switch_project_3",
  SWITCH_PROJECT_4: "switch_project_4",
  SWITCH_PROJECT_5: "switch_project_5",
  SWITCH_PROJECT_6: "switch_project_6",
  SWITCH_PROJECT_7: "switch_project_7",
  SWITCH_PROJECT_8: "switch_project_8",
  SWITCH_PROJECT_9: "switch_project_9",
  TOGGLE_SIDEBAR: "toggle_sidebar",
  COMMIT: "commit",
} as const;
export type ShortcutActionId = (typeof ShortcutActions)[keyof typeof ShortcutActions];

export const ShortcutGroups = {
  NAVIGATION: "navigation",
  SESSIONS: "sessions",
  PROJECT: "project",
  PROJECTS: "projects",
} as const;
export type ShortcutGroup = (typeof ShortcutGroups)[keyof typeof ShortcutGroups];

export const ShortcutGroupOptions: { id: ShortcutGroup; label: string }[] = [
  { id: ShortcutGroups.NAVIGATION, label: "Navigation" },
  { id: ShortcutGroups.SESSIONS, label: "AI sessions" },
  { id: ShortcutGroups.PROJECT, label: "Project" },
  { id: ShortcutGroups.PROJECTS, label: "Switch project" },
];

export interface ShortcutActionOption {
  id: ShortcutActionId;
  label: string;
  group: ShortcutGroup;
  /** Canonical combo, e.g. `mod+shift+p` (`mod` = Ctrl on Windows/Linux, ⌘ on macOS); null = unbound until the user picks one. */
  default_combo: string | null;
  /** False for shortcuts handled inside a component (shown for reference, cannot be changed). */
  rebindable: boolean;
}

const switchProject = (n: number, id: ShortcutActionId): ShortcutActionOption => ({
  id,
  label: `Switch to project ${n}`,
  group: ShortcutGroups.PROJECTS,
  default_combo: `mod+${n}`,
  rebindable: true,
});

export const ShortcutActionOptions: ShortcutActionOption[] = [
  { id: ShortcutActions.COMMAND_PALETTE, label: "Open command palette", group: ShortcutGroups.NAVIGATION, default_combo: "mod+k", rebindable: true },
  { id: ShortcutActions.OPEN_SETTINGS, label: "Open settings", group: ShortcutGroups.NAVIGATION, default_combo: null, rebindable: true },
  { id: ShortcutActions.OPEN_INTEGRATIONS, label: "Open integrations", group: ShortcutGroups.NAVIGATION, default_combo: null, rebindable: true },
  { id: ShortcutActions.TOGGLE_SIDEBAR, label: "Toggle sidebar", group: ShortcutGroups.NAVIGATION, default_combo: "mod+b", rebindable: false },
  { id: ShortcutActions.NEW_SESSION, label: "New AI session", group: ShortcutGroups.SESSIONS, default_combo: "mod+t", rebindable: true },
  { id: ShortcutActions.TOGGLE_AI_PANEL, label: "Toggle AI panel", group: ShortcutGroups.SESSIONS, default_combo: "mod+j", rebindable: true },
  { id: ShortcutActions.NEXT_SESSION_TAB, label: "Next session tab", group: ShortcutGroups.SESSIONS, default_combo: "mod+tab", rebindable: true },
  { id: ShortcutActions.PREV_SESSION_TAB, label: "Previous session tab", group: ShortcutGroups.SESSIONS, default_combo: "mod+shift+tab", rebindable: true },
  { id: ShortcutActions.ADD_PROJECT, label: "Add project", group: ShortcutGroups.PROJECT, default_combo: null, rebindable: true },
  { id: ShortcutActions.TOGGLE_PREVIEW, label: "Toggle preview", group: ShortcutGroups.PROJECT, default_combo: "mod+shift+p", rebindable: true },
  { id: ShortcutActions.COMMIT, label: "Commit (in the commit box)", group: ShortcutGroups.PROJECT, default_combo: "mod+enter", rebindable: false },
  switchProject(1, ShortcutActions.SWITCH_PROJECT_1),
  switchProject(2, ShortcutActions.SWITCH_PROJECT_2),
  switchProject(3, ShortcutActions.SWITCH_PROJECT_3),
  switchProject(4, ShortcutActions.SWITCH_PROJECT_4),
  switchProject(5, ShortcutActions.SWITCH_PROJECT_5),
  switchProject(6, ShortcutActions.SWITCH_PROJECT_6),
  switchProject(7, ShortcutActions.SWITCH_PROJECT_7),
  switchProject(8, ShortcutActions.SWITCH_PROJECT_8),
  switchProject(9, ShortcutActions.SWITCH_PROJECT_9),
];

export const CustomShortcutTypeFormOptions: { id: CustomShortcutType; label: string }[] = [
  { id: CustomShortcutTypes.ACTION, label: "Run an action" },
  { id: CustomShortcutTypes.AI_PROMPT, label: "Start an AI session with a prompt" },
];

/** Actions a custom shortcut can run (component-local shortcuts like the sidebar toggle are excluded). */
export const CustomShortcutActionFormOptions: { id: ShortcutActionId; label: string }[] = ShortcutActionOptions.filter((option) => option.rebindable).map(({ id, label }) => ({ id, label }));

export function getShortcutActionLabel(id: ShortcutActionId | string): string {
  return ShortcutActionOptions.find((option) => option.id === id)?.label ?? id;
}
