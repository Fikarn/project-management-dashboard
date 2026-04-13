import type { BrowserWindow } from "electron";
import { dialog } from "electron";
import { autoUpdater } from "electron-updater";

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", (info) => {
    const window = getMainWindow();
    if (!window) return;

    dialog
      .showMessageBox(window, {
        type: "info",
        title: "Update Ready",
        message: `Version ${info.version} has been downloaded and will be installed when you quit.`,
        buttons: ["Install Now", "Later"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      })
      .catch(() => {});
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-updater error:", error?.message ?? error);
  });

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}
