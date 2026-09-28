import { BadRequestException } from '@nestjs/common';
import {
  assertValidShortcutSettings,
  resolveShortcutSettings,
} from './shortcut-settings.utils';

const valid = {
  bindings: { command_palette: 'mod+shift+k' },
  custom: [
    {
      id: 'c1',
      name: 'Review my diff',
      combo: 'mod+shift+d',
      type: 'ai_prompt',
      prompt: 'Review the uncommitted changes.',
    },
    {
      id: 'c2',
      name: 'Settings',
      combo: 'mod+,',
      type: 'action',
      action_id: 'open_settings',
    },
  ],
};

describe('assertValidShortcutSettings', () => {
  it('accepts a complete valid value and trims names', () => {
    const result = assertValidShortcutSettings({
      ...valid,
      custom: [{ ...valid.custom[0], name: '  Review my diff  ' }],
    });
    expect(result.bindings).toEqual(valid.bindings);
    expect(result.custom[0].name).toBe('Review my diff');
  });

  it('accepts an empty value', () => {
    expect(assertValidShortcutSettings({ bindings: {}, custom: [] })).toEqual({
      bindings: {},
      custom: [],
    });
  });

  it.each([
    ['non-object', 'nope'],
    ['unknown top-level key', { ...valid, extra: 1 }],
    ['missing bindings', { custom: [] }],
    ['missing custom', { bindings: {} }],
    ['unknown action id', { bindings: { nope: 'mod+k' }, custom: [] }],
    ['combo without mod', { bindings: { command_palette: 'k' }, custom: [] }],
    ['uppercase combo', { bindings: { command_palette: 'mod+K' }, custom: [] }],
    ['alt combo', { bindings: { command_palette: 'mod+alt+k' }, custom: [] }],
    ['reserved combo', { bindings: { command_palette: 'mod+c' }, custom: [] }],
    [
      'same combo twice',
      {
        bindings: { command_palette: 'mod+shift+k', new_session: 'mod+shift+k' },
        custom: [],
      },
    ],
    [
      'custom clashing with a binding',
      {
        bindings: { command_palette: 'mod+shift+d' },
        custom: [valid.custom[0]],
      },
    ],
    [
      'duplicate custom id',
      {
        bindings: {},
        custom: [valid.custom[0], { ...valid.custom[1], id: 'c1' }],
      },
    ],
    [
      'blank custom name',
      { bindings: {}, custom: [{ ...valid.custom[0], name: '   ' }] },
    ],
    [
      'unknown custom type',
      { bindings: {}, custom: [{ ...valid.custom[0], type: 'shell' }] },
    ],
    [
      'action type without a known action',
      {
        bindings: {},
        custom: [{ ...valid.custom[1], action_id: 'rm_rf' }],
      },
    ],
    [
      'ai_prompt without a prompt',
      { bindings: {}, custom: [{ ...valid.custom[0], prompt: '' }] },
    ],
    [
      'oversized prompt',
      {
        bindings: {},
        custom: [{ ...valid.custom[0], prompt: 'x'.repeat(4001) }],
      },
    ],
    [
      'unknown custom key',
      { bindings: {}, custom: [{ ...valid.custom[0], command: 'ls' }] },
    ],
    [
      'too many custom shortcuts',
      {
        bindings: {},
        custom: Array.from({ length: 21 }, (_, i) => ({
          id: `c${i}`,
          name: `S${i}`,
          combo: `mod+f${(i % 12) + 1}`,
          type: 'ai_prompt',
          prompt: 'hi',
        })),
      },
    ],
  ])('rejects %s', (_label, value) => {
    expect(() => assertValidShortcutSettings(value)).toThrow(
      BadRequestException,
    );
  });
});

describe('resolveShortcutSettings', () => {
  it('returns defaults for null or malformed storage', () => {
    expect(resolveShortcutSettings(null)).toEqual({ bindings: {}, custom: [] });
    expect(resolveShortcutSettings('x')).toEqual({ bindings: {}, custom: [] });
    expect(resolveShortcutSettings([])).toEqual({ bindings: {}, custom: [] });
  });

  it('keeps valid entries and drops malformed ones', () => {
    const result = resolveShortcutSettings({
      bindings: { command_palette: 'mod+shift+k', nope: 'mod+j', new_session: 'k' },
      custom: [valid.custom[0], { id: 'bad' }, 'junk', { ...valid.custom[1], combo: 'mod+c' }],
    });
    expect(result.bindings).toEqual({ command_palette: 'mod+shift+k' });
    expect(result.custom.map((c) => c.id)).toEqual(['c1']);
  });
});
