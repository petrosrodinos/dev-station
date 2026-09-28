import { BrowserWindow, Notification } from "electron";
import { IpcChannels, type OsNotificationInput } from "../shared/contract";

// Native OS notifications. Clicking one raises the window and tells the renderer where to navigate.

class NotificationManager {
  private active = new Set<Notification>();

  show(input: OsNotificationInput): boolean {
    if (!Notification.isSupported()) return false;
    const notification = new Notification({ title: input.title, body: input.body });
    // Hold a reference so the notification isn't garbage-collected before the user clicks it.
    this.active.add(notification);
    notification.on("click", () => {
      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send(IpcChannels.NOTIF_CLICK, { project_id: input.project_id, session_id: input.session_id });
      }
    });
    notification.on("close", () => this.active.delete(notification));
    notification.show();
    return true;
  }
}

export const notificationManager = new NotificationManager();
