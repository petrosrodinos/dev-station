import {
  ShortcutActionOptions,
  getShortcutActionLabel,
  type ShortcutActionId,
  type ShortcutGroup,
} from "@/config/constants/dropdowns/shared/shortcut-action.options";
import type { CustomShortcut } from "@/features/users/interfaces/users.interfaces";

/** Mirrors the API pattern: `mod+` is required, optional `shift+`, then a single key. */
export const SHORTCUT_COMBO_PATTERN = /^mod\+(shift\+)?([a-z0-9,./;'[\]\\`=-]|tab|enter|space|up|down|left|right|f([1-9]|1[0-2]))$/;

/** Combos the OS or text editing already owns; never bindable (mirrors the API list). */
export const RESERVED_SHORTCUT_COMBOS: readonly string[] = [
  "mod+a",
  "mod+c",
  "mod+v",
  "mod+x",
  "mod+z",
  "mod+shift+z",
  "mod+y",
  "mod+w",
  "mod+q",
  "mod+r",
  "mod+shift+r",
  "mod+f",
  "mod+l",
  "mod+n",
  "mod+shift+n",
  "mod+p",
  "mod+s",
];

const NAMED_KEYS: Record<string, string> = {
  Tab: "tab",
  Enter: "enter",
  " ": "space",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const PUNCTUATION_CODES: Record<string, string> = {
  Comma: ",",
  Period: ".",
  Slash: "/",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Backquote: "`",
  Equal: "=",
  Minus: "-",
};

const KEY_LABELS: Record<string, string> = {
  tab: "Tab",
  enter: "Enter",
  space: "Space",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * Canonical combo for a key event, or null when the event is not a bindable shortcut
 * (no Ctrl/⌘, Alt held, or a bare modifier key). Letters/digits/punctuation use `event.code`
 * so shortcuts keep working on non-Latin layouts and with Shift held.
 */
export function eventToCombo(event: KeyboardEvent): string | null {
  if (event.altKey || !(event.metaKey || event.ctrlKey)) return null;

  let key: string | null = null;
  if (/^Key[A-Z]$/.test(event.code)) key = event.code.slice(3).toLowerCase();
  else if (/^Digit[0-9]$/.test(event.code)) key = event.code.slice(5);
  else if (PUNCTUATION_CODES[event.code]) key = PUNCTUATION_CODES[event.code];
  else if (NAMED_KEYS[event.key]) key = NAMED_KEYS[event.key];
  else if (/^F([1-9]|1[0-2])$/.test(event.key)) key = event.key.toLowerCase();
  if (!key) return null;

  const combo = `mod+${event.shiftKey ? "shift+" : ""}${key}`;
  return SHORTCUT_COMBO_PATTERN.test(combo) ? combo : null;
}

/** Display parts for a combo, e.g. `mod+shift+p` -> ["Ctrl", "Shift", "P"] (or ["⌘", "⇧", "P"] on macOS). */
export function formatComboParts(combo: string, mac: boolean = isMac()): string[] {
  return combo.split("+").map((part) => {
    if (part === "mod") return mac ? "⌘" : "Ctrl";
    if (part === "shift") return mac ? "⇧" : "Shift";
    return KEY_LABELS[part] ?? part.toUpperCase();
  });
}

const CODE_BY_KEY: Record<string, string> = {
  tab: "Tab",
  enter: "Enter",
  space: "Space",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  ...Object.fromEntries(Object.entries(PUNCTUATION_CODES).map(([code, key]) => [key, code])),
};

/** Physical key codes (`KeyboardEvent.code`) a combo needs, e.g. `mod+shift+p` -> ControlLeft, ShiftLeft, KeyP. Used to hint keys on the practice keyboard. */
export function comboToCodes(combo: string, mac: boolean = isMac()): string[] {
  return combo.split("+").map((part) => {
    if (part === "mod") return mac ? "MetaLeft" : "ControlLeft";
    if (part === "shift") return "ShiftLeft";
    if (CODE_BY_KEY[part]) return CODE_BY_KEY[part];
    if (/^[a-z]$/.test(part)) return `Key${part.toUpperCase()}`;
    if (/^[0-9]$/.test(part)) return `Digit${part}`;
    return part.toUpperCase();
  });
}

export interface ResolvedShortcut {
  id: string;
  kind: "action" | "custom";
  label: string;
  /** Null when the action is unbound. */
  combo: string | null;
  action_id?: ShortcutActionId;
  custom?: CustomShortcut;
  group?: ShortcutGroup;
  /** Built-in action whose binding the user may change. */
  rebindable: boolean;
  is_default: boolean;
}

/** Effective shortcut list: built-in actions (default or overridden) followed by custom shortcuts. */
export function resolveShortcuts(bindings: Record<string, string>, custom: CustomShortcut[]): ResolvedShortcut[] {
  const actions = ShortcutActionOptions.map<ResolvedShortcut>((option) => {
    const override = option.rebindable ? bindings[option.id] : undefined;
    return {
      id: option.id,
      kind: "action",
      label: option.label,
      combo: override ?? option.default_combo,
      action_id: option.id,
      group: option.group,
      rebindable: option.rebindable,
      is_default: override === undefined,
    };
  });
  const customs = custom.map<ResolvedShortcut>((shortcut) => ({
    id: shortcut.id,
    kind: "custom",
    label: shortcut.name,
    combo: shortcut.combo,
    custom: shortcut,
    rebindable: false,
    is_default: false,
  }));
  return [...actions, ...customs];
}

export function buildComboIndex(shortcuts: ResolvedShortcut[]): Map<string, ResolvedShortcut> {
  const index = new Map<string, ResolvedShortcut>();
  for (const shortcut of shortcuts) {
    if (shortcut.combo && !index.has(shortcut.combo)) index.set(shortcut.combo, shortcut);
  }
  return index;
}

/** Human-readable reason a combo cannot be used for `ownerId`, or null when it is free. */
export function getComboConflict(combo: string, shortcuts: ResolvedShortcut[], ownerId: string | null): string | null {
  if (RESERVED_SHORTCUT_COMBOS.includes(combo)) return "Reserved by the system or text editing.";
  const owner = shortcuts.find((shortcut) => shortcut.combo === combo && shortcut.id !== ownerId);
  return owner ? `Already used by "${owner.label}".` : null;
}

/** Ids of shortcuts sharing a combo with another; used to flag stale duplicates after a merge from the server. */
export function findConflictingIds(shortcuts: ResolvedShortcut[]): Set<string> {
  const byCombo = new Map<string, string[]>();
  for (const shortcut of shortcuts) {
    if (!shortcut.combo) continue;
    byCombo.set(shortcut.combo, [...(byCombo.get(shortcut.combo) ?? []), shortcut.id]);
  }
  const conflicting = new Set<string>();
  for (const ids of byCombo.values()) if (ids.length > 1) ids.forEach((id) => conflicting.add(id));
  return conflicting;
}

export const describeShortcutTarget = (shortcut: ResolvedShortcut): string => {
  if (shortcut.kind === "action") return shortcut.label;
  const { custom } = shortcut;
  if (custom?.type === "action" && custom.action_id) return getShortcutActionLabel(custom.action_id);
  return `Start AI session: ${shortcut.label}`;
};
