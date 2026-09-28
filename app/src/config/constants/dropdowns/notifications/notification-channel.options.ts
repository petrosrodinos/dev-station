import { NotificationChannels, type NotificationChannel } from "@/features/users/interfaces/users.interfaces";

export const NotificationChannelOptions: { id: NotificationChannel; label: string }[] = [
    { id: NotificationChannels.BADGE, label: "Badge" },
    { id: NotificationChannels.FEED, label: "Feed" },
    { id: NotificationChannels.OS, label: "Desktop" },
];

export const NotificationChannelDescriptionOptions: { id: NotificationChannel; label: string }[] = [
    { id: NotificationChannels.BADGE, label: "Attention badge on the project rail and session tab." },
    { id: NotificationChannels.FEED, label: "Entry in the status-bar activity feed." },
    { id: NotificationChannels.OS, label: "Native desktop notification." },
];

export const getNotificationChannelLabel = (id: NotificationChannel) => NotificationChannelOptions.find((o) => o.id === id)?.label ?? id;
