import { NotificationEventTypes, type NotificationEventType } from "@/features/users/interfaces/users.interfaces";

export const NotificationEventOptions: { id: NotificationEventType; label: string }[] = [
    { id: NotificationEventTypes.AGENT_FINISHED, label: "Agent finished" },
    { id: NotificationEventTypes.AGENT_AWAITING_INPUT, label: "Agent needs input" },
    { id: NotificationEventTypes.AGENT_CRASHED, label: "Agent crashed" },
    { id: NotificationEventTypes.SERVICE_CRASHED, label: "Service crashed" },
    { id: NotificationEventTypes.GIT_COMMIT, label: "Git commit" },
    { id: NotificationEventTypes.GIT_PUSH, label: "Git push" },
    { id: NotificationEventTypes.GIT_PULL, label: "Git pull" },
];

export const NotificationEventDescriptionOptions: { id: NotificationEventType; label: string }[] = [
    { id: NotificationEventTypes.AGENT_FINISHED, label: "An AI session completed its run." },
    { id: NotificationEventTypes.AGENT_AWAITING_INPUT, label: "An AI session went quiet and is waiting for you." },
    { id: NotificationEventTypes.AGENT_CRASHED, label: "An AI session exited with an error." },
    { id: NotificationEventTypes.SERVICE_CRASHED, label: "A running service exited unexpectedly." },
    { id: NotificationEventTypes.GIT_COMMIT, label: "A commit was created from Dev Station." },
    { id: NotificationEventTypes.GIT_PUSH, label: "Commits were pushed to the remote." },
    { id: NotificationEventTypes.GIT_PULL, label: "Changes were pulled from the remote." },
];

export const getNotificationEventLabel = (id: NotificationEventType) => NotificationEventOptions.find((o) => o.id === id)?.label ?? id;
