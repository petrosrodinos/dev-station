import { BadRequestException } from '@nestjs/common';
import { MAX_LAYOUT_JSON_BYTES } from '../constants/workspace-layouts.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The server never interprets dockview's tree semantics — that validation happens client-side
 * via dockview's own `fromJSON`. Here we only reject obviously-garbage payloads (wrong shape,
 * unreasonably large) so a bad row can never be written in the first place.
 */
export function assertValidLayout(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException('layout must be an object');
  }
  const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (size > MAX_LAYOUT_JSON_BYTES) {
    throw new BadRequestException(
      `layout is too large (${size} bytes, max ${MAX_LAYOUT_JSON_BYTES})`,
    );
  }
  return value;
}

export function assertValidFloating(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException('floating must be an array');
  }
  const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (size > MAX_LAYOUT_JSON_BYTES) {
    throw new BadRequestException(
      `floating is too large (${size} bytes, max ${MAX_LAYOUT_JSON_BYTES})`,
    );
  }
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new BadRequestException('Each floating entry must be an object');
    }
  }
  return value;
}

/** Defensive read: an unreadable/legacy `preset_by_project` blob resolves to an empty map, never a crash. */
export function resolvePresetByProject(
  stored: unknown,
): Record<string, string> {
  if (!isRecord(stored)) return {};
  const result: Record<string, string> = {};
  for (const [projectId, presetId] of Object.entries(stored)) {
    if (typeof presetId === 'string') result[projectId] = presetId;
  }
  return result;
}
