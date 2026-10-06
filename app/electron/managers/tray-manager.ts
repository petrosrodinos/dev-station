import { Menu, nativeImage, Tray } from "electron";
import { APP_ICON_PATH } from "../utils/app-icon";

// Notification-area icon used while the window is hidden in the background: the way back to the app,
// and a way to quit it without reopening the window first.

interface TrayHandlers {
  onOpen: () => void;
  onQuit: () => void;
}

class TrayManager {
  private tray: Tray | null = null;

  show(handlers: TrayHandlers) {
    if (this.tray) return;
    const icon = nativeImage.createFromPath(APP_ICON_PATH).resize({ width: 16, height: 16 });
    const tray = new Tray(icon);
    tray.setToolTip("Dev Station");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open Dev Station", click: handlers.onOpen },
        { type: "separator" },
        { label: "Quit Dev Station", click: handlers.onQuit },
      ]),
    );
    tray.on("click", handlers.onOpen);
    this.tray = tray;
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}

export const trayManager = new TrayManager();
