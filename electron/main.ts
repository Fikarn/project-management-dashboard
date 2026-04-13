import { app, BrowserWindow, Tray, powerMonitor } from "electron";
import { URL } from "./config";
import { postLocalApi } from "./localApi";
import { createServerManager } from "./serverManager";
import {
  createMainWindow,
  createShutdownWindow,
  createTray,
  installDockMenu,
  loadSplash,
  showBackgroundRunningNotification,
  updateSplashStatus,
} from "./shell";
import { setupAutoUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let hasShownCloseNotification = false;

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
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true });
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
  if (process.platform === "darwin") {
    if (!hasShownCloseNotification && !isQuitting) {
      hasShownCloseNotification = true;
      showBackgroundRunningNotification();
    }
  } else if (process.platform !== "win32") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (isQuitting) return;

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
