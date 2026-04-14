import { app, BrowserWindow, Tray, powerMonitor, ipcMain, dialog } from "electron";
import { URL } from "./config";
import { postLocalApi } from "./localApi";
import { ensureDefaultOpenAtLoginEnabled } from "./runtimePrefs";
import { createServerManager } from "./serverManager";
import {
  createMainWindow,
  createShutdownWindow,
  createTray,
  installDockMenu,
  loadSplash,
  updateSplashStatus,
} from "./shell";
import { checkForAppUpdates, getUpdateStatus, setupAutoUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let quitConfirmed = false;
let quitPromptOpen = false;

const serverManager = createServerManager({
  isQuitting: () => isQuitting,
  onRestartReady: () => {
    void mainWindow?.loadURL(URL);
  },
});

function ensureMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  mainWindow = createMainWindow({
    isQuitting: () => isQuitting,
    onClosed: () => {
      mainWindow = null;
    },
    onRequestQuit: () => {
      void requestQuitConfirmation();
    },
  });

  return mainWindow;
}

function openConsole(loadMainUrl = false): void {
  const window = ensureMainWindow();
  if (loadMainUrl && window.webContents.getURL() !== URL) {
    void window.loadURL(URL);
  }
  window.show();
  window.focus();
}

function getCloseBehavior(): "confirm-quit" {
  return "confirm-quit";
}

function buildAppInfoSnapshot() {
  let openAtLoginEnabled = false;
  try {
    openAtLoginEnabled = app.getLoginItemSettings().openAtLogin;
  } catch {
    openAtLoginEnabled = false;
  }

  return {
    name: "SSE ExEd Studio Control",
    version: app.getVersion(),
    platform: process.platform,
    isPackaged: app.isPackaged,
    openAtLoginEnabled,
    closeBehavior: getCloseBehavior(),
  };
}

async function requestQuitConfirmation(): Promise<void> {
  if (isQuitting || quitPromptOpen) return;

  quitPromptOpen = true;
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const dialogOptions = {
    type: "warning" as const,
    title: "Quit SSE ExEd Studio Control?",
    message: "Closing the window will fully quit the app.",
    detail: "Lighting and audio control will stop, and any downloaded update will install after the app quits.",
    buttons: ["Cancel", "Quit"],
    cancelId: 0,
    defaultId: 1,
  };

  try {
    const { response } = window
      ? await dialog.showMessageBox(window, dialogOptions)
      : await dialog.showMessageBox(dialogOptions);

    if (response === 1) {
      quitConfirmed = true;
      app.quit();
    }
  } catch {
    // Ignore dialog failures and keep the app running.
  } finally {
    quitPromptOpen = false;
  }
}

function registerDesktopInfoHandlers(): void {
  ipcMain.handle("desktop:get-app-info", () => {
    return buildAppInfoSnapshot();
  });

  ipcMain.handle("desktop:get-update-status", () => getUpdateStatus());
  ipcMain.handle("desktop:check-for-updates", () => checkForAppUpdates());
  ipcMain.handle("desktop:set-open-at-login", (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    return buildAppInfoSnapshot();
  });
}

function registerPowerHandlers(): void {
  powerMonitor.on("suspend", () => {
    console.log("System suspending — sending DMX blackout");
    postLocalApi("/api/lights/shutdown").catch(() => {
      // System is going to sleep anyway.
    });
  });

  powerMonitor.on("resume", () => {
    console.log("System resumed — reinitializing DMX after delay");
    setTimeout(() => {
      postLocalApi("/api/lights/settings", { dmxEnabled: true }).catch((error) => {
        console.error("Failed to reinitialize DMX after wake:", error);
      });
    }, 3000);
  });
}

process.on("uncaughtException", (error) => {
  console.error("[CRITICAL] Electron main process uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Electron main process unhandled rejection:", reason);
});

app.whenReady().then(async () => {
  registerDesktopInfoHandlers();

  if (app.isPackaged) {
    ensureDefaultOpenAtLoginEnabled();
  }

  serverManager.start();

  const window = ensureMainWindow();
  loadSplash(window);
  window.once("ready-to-show", () => window.show());

  const startTime = Date.now();
  const startupTimers = [
    setTimeout(() => updateSplashStatus(mainWindow, "Starting server...", "First launch may take a moment"), 5000),
    setTimeout(
      () => updateSplashStatus(mainWindow, "Starting server...", "This is taking longer than usual..."),
      15000
    ),
    setTimeout(() => updateSplashStatus(mainWindow, "Starting server...", "Almost there..."), 25000),
  ];
  const clearStartupTimers = () => startupTimers.forEach(clearTimeout);

  updateSplashStatus(mainWindow, "Loading data...");

  try {
    await serverManager.waitForServer(60);
    clearStartupTimers();
    updateSplashStatus(mainWindow, "Ready");
    await new Promise((resolve) => setTimeout(resolve, Date.now() - startTime > 3000 ? 200 : 500));
    await mainWindow?.loadURL(URL);

    if (app.isPackaged) {
      setupAutoUpdater(() => mainWindow);
    }
  } catch (error) {
    clearStartupTimers();
    console.error("Failed to start server:", error);
    const { dialog } = await import("electron");
    dialog.showErrorBox(
      "Server Failed to Start",
      "The internal server could not start. Please try restarting the application.\n\n" + String(error)
    );
    serverManager.stop();
    app.exit(1);
    return;
  }

  if (process.platform === "win32") {
    tray = createTray({
      onOpen: () => openConsole(true),
      onQuit: () => app.quit(),
    });
  }

  installDockMenu(() => openConsole(true));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openConsole(true);
      return;
    }
    openConsole();
  });

  registerPowerHandlers();
});

app.on("window-all-closed", () => {
  if (!isQuitting) {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (isQuitting) return;

  if (!quitConfirmed) {
    event.preventDefault();
    void requestQuitConfirmation();
    return;
  }

  isQuitting = true;
  event.preventDefault();

  const shutdownWindow = createShutdownWindow();
  try {
    await postLocalApi("/api/lights/shutdown", undefined, 5000);
  } catch {
    // Continue shutting down even if blackout fails.
  }

  if (shutdownWindow && !shutdownWindow.isDestroyed()) {
    shutdownWindow.close();
  }

  serverManager.stop();
  app.exit();
});
