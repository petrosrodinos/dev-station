import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  NotificationSettings,
} from '../constants/notification-settings.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Layers a partial (possibly stored or user-supplied) value over the defaults, dropping unknown keys. */
export function resolveNotificationSettings(
  partial: unknown,
): NotificationSettings {
  const base = DEFAULT_NOTIFICATION_SETTINGS;
  const input = isRecord(partial) ? partial : {};
  const inputEvents = isRecord(input.events) ? input.events : {};

  const events = { ...base.events };
  for (const type of NOTIFICATION_EVENT_TYPES) {
    const entry = inputEvents[type];
    const merged = { ...base.events[type] };
    if (isRecord(entry)) {
      for (const channel of NOTIFICATION_CHANNELS) {
        if (typeof entry[channel] === 'boolean')
          merged[channel] = entry[channel];
      }
    }
    events[type] = merged;
  }

  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : base.enabled,
    events,
  };
}

export function assertValidNotificationSettingsPatch(patch: unknown): void {
  if (!isRecord(patch)) {
    throw new BadRequestException('notification_settings must be an object');
  }
  const { enabled, events, ...rest } = patch;
  if (Object.keys(rest).length) {
    throw new BadRequestException(
      `Unknown notification_settings keys: ${Object.keys(rest).join(', ')}`,
    );
  }
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw new BadRequestException(
      'notification_settings.enabled must be a boolean',
    );
  }
  if (events === undefined) return;
  if (!isRecord(events)) {
    throw new BadRequestException(
      'notification_settings.events must be an object',
    );
  }
  for (const [type, entry] of Object.entries(events)) {
    if (!(NOTIFICATION_EVENT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Unknown notification event: ${type}`);
    }
    if (!isRecord(entry)) {
      throw new BadRequestException(
        `Notification event ${type} must be an object`,
      );
    }
    for (const [channel, value] of Object.entries(entry)) {
      if (!(NOTIFICATION_CHANNELS as readonly string[]).includes(channel)) {
        throw new BadRequestException(
          `Unknown notification channel for ${type}: ${channel}`,
        );
      }
      if (typeof value !== 'boolean') {
        throw new BadRequestException(
          `Notification ${type}.${channel} must be a boolean`,
        );
      }
    }
  }
}
