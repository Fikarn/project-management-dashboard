import type { BrowserWindow } from "electron";
import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

export type UpdateStatusKind =
  | "idle"
  | "checking"
  | "available"
  | "downloaded"
  | "not-available"
  | "unavailable"
  | "error";

export interface UpdateStatusSnapshot {
  status: UpdateStatusKind;
  message: string;
  version: string | null;
}

let currentUpdateStatus: UpdateStatusSnapshot = {
  status: "idle",
  message: "Automatic update checks start shortly after launch.",
  version: null,
};

function setUpdateStatus(snapshot: UpdateStatusSnapshot): void {
  currentUpdateStatus = snapshot;
}

export function getUpdateStatus(): UpdateStatusSnapshot {
  return currentUpdateStatus;
}

export async function checkForAppUpdates(): Promise<UpdateStatusSnapshot> {
  if (!app.isPackaged) {
    const status = {
      status: "unavailable" as const,
      message: "Manual update checks are available only in packaged desktop builds.",
      version: null,
    };
    setUpdateStatus(status);
    return status;
  }

  try {
    setUpdateStatus({
      status: "checking",
      message: "Checking GitHub Releases for updates...",
      version: app.getVersion(),
    });

    const result = await autoUpdater.checkForUpdates();
    const targetVersion = result?.updateInfo?.version ?? null;

    if (targetVersion && targetVersion !== app.getVersion()) {
      const status = {
        status: "available" as const,
        message: `Version ${targetVersion} is available and is downloading in the background.`,
        version: targetVersion,
      };
      setUpdateStatus(status);
      return status;
    }

    const status = {
      status: "not-available" as const,
      message: `You are up to date on version ${app.getVersion()}.`,
      version: app.getVersion(),
    };
    setUpdateStatus(status);
    return status;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = {
      status: "error" as const,
      message: `Update check failed: ${message}`,
      version: app.getVersion(),
    };
    setUpdateStatus(status);
    return status;
  }
}

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  setUpdateStatus({
    status: "idle",
    message: "Automatic update checks start shortly after launch.",
    version: app.getVersion(),
  });

  autoUpdater.on("checking-for-update", () => {
    setUpdateStatus({
      status: "checking",
      message: "Checking GitHub Releases for updates...",
      version: app.getVersion(),
    });
  });

  autoUpdater.on("update-available", (info) => {
    setUpdateStatus({
      status: "available",
      message: `Version ${info.version} is available and is downloading in the background.`,
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setUpdateStatus({
      status: "not-available",
      message: `You are up to date on version ${app.getVersion()}.`,
      version: app.getVersion(),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setUpdateStatus({
      status: "downloaded",
      message: `Version ${info.version} has downloaded. Fully quit the app to install it.`,
      version: info.version,
    });

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
    setUpdateStatus({
      status: "error",
      message: `Update error: ${error?.message ?? String(error)}`,
      version: app.getVersion(),
    });
    console.error("Auto-updater error:", error?.message ?? error);
  });

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}
