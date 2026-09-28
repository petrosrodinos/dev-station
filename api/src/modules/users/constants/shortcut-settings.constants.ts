export const SHORTCUT_ACTION_IDS = [
  'command_palette',
  'new_session',
  'toggle_ai_panel',
  'next_session_tab',
  'prev_session_tab',
  'toggle_preview',
  'open_settings',
  'open_integrations',
  'add_project',
  'switch_project_1',
  'switch_project_2',
  'switch_project_3',
  'switch_project_4',
  'switch_project_5',
  'switch_project_6',
  'switch_project_7',
  'switch_project_8',
  'switch_project_9',
] as const;

export type ShortcutActionId = (typeof SHORTCUT_ACTION_IDS)[number];

export const CUSTOM_SHORTCUT_TYPES = ['action', 'ai_prompt'] as const;
export type CustomShortcutType = (typeof CUSTOM_SHORTCUT_TYPES)[number];

export interface CustomShortcut {
  id: string;
  name: string;
  combo: string;
  type: CustomShortcutType;
  action_id?: ShortcutActionId;
  prompt?: string;
}

export interface ShortcutSettings {
  /** Overrides keyed by action id; missing = default binding. */
  bindings: Partial<Record<ShortcutActionId, string>>;
  custom: CustomShortcut[];
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  bindings: {},
  custom: [],
};

export const MAX_CUSTOM_SHORTCUTS = 20;
export const MAX_CUSTOM_SHORTCUT_NAME_LENGTH = 60;
export const MAX_CUSTOM_SHORTCUT_PROMPT_LENGTH = 4000;

/** Canonical combo: `mod+` (Ctrl/Cmd) is required, optional `shift+`, then one key. */
export const SHORTCUT_COMBO_PATTERN =
  /^mod\+(shift\+)?([a-z0-9,./;'[\]\\`=-]|tab|enter|space|up|down|left|right|f([1-9]|1[0-2]))$/;

/** Combos the OS/browser/editing already owns; never bindable. */
export const RESERVED_SHORTCUT_COMBOS = [
  'mod+a',
  'mod+c',
  'mod+v',
  'mod+x',
  'mod+z',
  'mod+shift+z',
  'mod+y',
  'mod+w',
  'mod+q',
  'mod+r',
  'mod+shift+r',
  'mod+f',
  'mod+l',
  'mod+n',
  'mod+shift+n',
  'mod+p',
  'mod+s',
] as const;
