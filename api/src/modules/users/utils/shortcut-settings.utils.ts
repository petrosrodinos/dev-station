import { BadRequestException } from '@nestjs/common';
import {
  CUSTOM_SHORTCUT_TYPES,
  CustomShortcut,
  DEFAULT_SHORTCUT_SETTINGS,
  MAX_CUSTOM_SHORTCUTS,
  MAX_CUSTOM_SHORTCUT_NAME_LENGTH,
  MAX_CUSTOM_SHORTCUT_PROMPT_LENGTH,
  RESERVED_SHORTCUT_COMBOS,
  SHORTCUT_ACTION_IDS,
  SHORTCUT_COMBO_PATTERN,
  ShortcutActionId,
  ShortcutSettings,
} from '../constants/shortcut-settings.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isActionId = (value: unknown): value is ShortcutActionId =>
  typeof value === 'string' &&
  (SHORTCUT_ACTION_IDS as readonly string[]).includes(value);

const isValidCombo = (value: unknown): value is string =>
  typeof value === 'string' &&
  SHORTCUT_COMBO_PATTERN.test(value) &&
  !(RESERVED_SHORTCUT_COMBOS as readonly string[]).includes(value);

/** Reads a stored value defensively: drops anything malformed so a bad row can never break preferences. */
export function resolveShortcutSettings(stored: unknown): ShortcutSettings {
  if (!isRecord(stored)) return { ...DEFAULT_SHORTCUT_SETTINGS };

  const bindings: ShortcutSettings['bindings'] = {};
  if (isRecord(stored.bindings)) {
    for (const [action, combo] of Object.entries(stored.bindings)) {
      if (isActionId(action) && isValidCombo(combo)) bindings[action] = combo;
    }
  }

  const custom: CustomShortcut[] = [];
  if (Array.isArray(stored.custom)) {
    for (const entry of stored.custom.slice(0, MAX_CUSTOM_SHORTCUTS)) {
      if (!isRecord(entry)) continue;
      const { id, name, combo, type, action_id, prompt } = entry;
      if (typeof id !== 'string' || typeof name !== 'string') continue;
      if (!isValidCombo(combo)) continue;
      if (type === 'action' && isActionId(action_id)) {
        custom.push({ id, name, combo, type, action_id });
      } else if (type === 'ai_prompt' && typeof prompt === 'string') {
        custom.push({ id, name, combo, type, prompt });
      }
    }
  }

  return { bindings, custom };
}

/** The whole settings object is replaced on update, so the patch must be a complete, valid value. */
export function assertValidShortcutSettings(value: unknown): ShortcutSettings {
  if (!isRecord(value)) {
    throw new BadRequestException('shortcut_settings must be an object');
  }
  const { bindings, custom, ...rest } = value;
  if (Object.keys(rest).length) {
    throw new BadRequestException(
      `Unknown shortcut_settings keys: ${Object.keys(rest).join(', ')}`,
    );
  }
  if (!isRecord(bindings)) {
    throw new BadRequestException('shortcut_settings.bindings must be an object');
  }
  if (!Array.isArray(custom)) {
    throw new BadRequestException('shortcut_settings.custom must be an array');
  }
  if (custom.length > MAX_CUSTOM_SHORTCUTS) {
    throw new BadRequestException(
      `You can add at most ${MAX_CUSTOM_SHORTCUTS} custom shortcuts`,
    );
  }

  const usedCombos = new Map<string, string>();
  const claim = (combo: string, owner: string) => {
    const existing = usedCombos.get(combo);
    if (existing) {
      throw new BadRequestException(
        `Shortcut ${combo} is used by both ${existing} and ${owner}`,
      );
    }
    usedCombos.set(combo, owner);
  };

  const cleanBindings: ShortcutSettings['bindings'] = {};
  for (const [action, combo] of Object.entries(bindings)) {
    if (!isActionId(action)) {
      throw new BadRequestException(`Unknown shortcut action: ${action}`);
    }
    if (!isValidCombo(combo)) {
      throw new BadRequestException(
        `Invalid or reserved shortcut for ${action}`,
      );
    }
    claim(combo, action);
    cleanBindings[action] = combo;
  }

  const ids = new Set<string>();
  const cleanCustom: CustomShortcut[] = custom.map((entry, index) => {
    const at = `shortcut_settings.custom[${index}]`;
    if (!isRecord(entry)) {
      throw new BadRequestException(`${at} must be an object`);
    }
    const { id, name, combo, type, action_id, prompt, ...extra } = entry;
    if (Object.keys(extra).length) {
      throw new BadRequestException(
        `${at} has unknown keys: ${Object.keys(extra).join(', ')}`,
      );
    }
    if (typeof id !== 'string' || !id || id.length > 64 || ids.has(id)) {
      throw new BadRequestException(`${at}.id must be a unique string`);
    }
    ids.add(id);
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > MAX_CUSTOM_SHORTCUT_NAME_LENGTH
    ) {
      throw new BadRequestException(
        `${at}.name must be 1-${MAX_CUSTOM_SHORTCUT_NAME_LENGTH} characters`,
      );
    }
    if (!isValidCombo(combo)) {
      throw new BadRequestException(`${at}.combo is invalid or reserved`);
    }
    claim(combo, `custom shortcut "${name}"`);

    if (!(CUSTOM_SHORTCUT_TYPES as readonly string[]).includes(type as string)) {
      throw new BadRequestException(`${at}.type must be action or ai_prompt`);
    }
    if (type === 'action') {
      if (!isActionId(action_id)) {
        throw new BadRequestException(`${at}.action_id is not a known action`);
      }
      return { id, name: name.trim(), combo, type, action_id };
    }
    if (
      typeof prompt !== 'string' ||
      !prompt.trim() ||
      prompt.length > MAX_CUSTOM_SHORTCUT_PROMPT_LENGTH
    ) {
      throw new BadRequestException(
        `${at}.prompt must be 1-${MAX_CUSTOM_SHORTCUT_PROMPT_LENGTH} characters`,
      );
    }
    return { id, name: name.trim(), combo, type: 'ai_prompt', prompt };
  });

  return { bindings: cleanBindings, custom: cleanCustom };
}
