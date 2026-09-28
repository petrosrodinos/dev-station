import type { OsNotificationInput } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

/** Shows a native OS notification. Resolves to false when the OS doesn't support them. */
export const showOsNotification = async (input: OsNotificationInput): Promise<boolean> => {
    try {
        return await getBridge().notifications.show(input);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to show the desktop notification."));
    }
};
