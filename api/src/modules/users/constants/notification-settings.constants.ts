export const NOTIFICATION_EVENT_TYPES = [
  'AGENT_FINISHED',
  'AGENT_AWAITING_INPUT',
  'AGENT_CRASHED',
  'SERVICE_CRASHED',
  'GIT_COMMIT',
  'GIT_PUSH',
  'GIT_PULL',
] as const;

export const NOTIFICATION_CHANNELS = [
  'badge',
  'feed',
  'os',
  'toast',
  'sound',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationChannelFlags = Record<NotificationChannel, boolean>;

export interface NotificationSettings {
  enabled: boolean;
  events: Record<NotificationEventType, NotificationChannelFlags>;
}

const flags = (
  badge: boolean,
  feed: boolean,
  os: boolean,
  toast: boolean,
  sound: boolean,
): NotificationChannelFlags => ({ badge, feed, os, toast, sound });

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  events: {
    AGENT_FINISHED: flags(true, true, false, true, true),
    AGENT_AWAITING_INPUT: flags(true, true, true, true, true),
    AGENT_CRASHED: flags(true, true, true, true, true),
    SERVICE_CRASHED: flags(false, true, true, true, false),
    GIT_COMMIT: flags(false, true, false, true, false),
    GIT_PUSH: flags(false, true, false, true, false),
    GIT_PULL: flags(false, true, false, true, false),
  },
};
