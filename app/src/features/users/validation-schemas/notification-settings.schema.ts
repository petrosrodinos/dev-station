import { z } from "zod";
import { NotificationEventTypes } from "../interfaces/users.interfaces";

const channelFlags = z.object({ badge: z.boolean(), feed: z.boolean(), os: z.boolean(), toast: z.boolean() });

export const notificationSettingsSchema = z.object({
    enabled: z.boolean(),
    events: z.object(Object.fromEntries(Object.values(NotificationEventTypes).map((type) => [type, channelFlags])) as Record<keyof typeof NotificationEventTypes, typeof channelFlags>),
});
export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;
