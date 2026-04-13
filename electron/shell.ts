import { app, BrowserWindow, Menu, Notification, Tray, dialog, nativeImage } from "electron";
import { getPreloadPath, getSplashPath, getTrayIconPath } from "./config";
import { loadWindowState, saveWindowState, shouldUseSavedPosition } from "./windowState";

interface CreateMainWindowOptions {
  isQuitting: () => boolean;
  onClosed: () => void;
}

export function createMainWindow({ isQuitting, onClosed }: CreateMainWindowOptions): BrowserWindow {
  const state = loadWindowState();

  const window = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(shouldUseSavedPosition(state) ? { x: state.x, y: state.y } : {}),
    title: "Studio Console",
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  if (state.isMaximized) {
    window.maximize();
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(window), 500);
  };

  window.on("resize", debouncedSave);
  window.on("move", debouncedSave);
  window.on("close", () => saveWindowState(window));

  if (process.platform === "win32") {
    window.on("close", (event) => {
      if (isQuitting()) return;
      event.preventDefault();
      saveWindowState(window);
      window.hide();
    });
  }

  window.on("unresponsive", () => {
    const choice = dialog.showMessageBoxSync(window, {
      type: "warning",
      title: "Window Unresponsive",
      message: "The window is not responding.",
      buttons: ["Wait", "Reload"],
      defaultId: 0,
    });
    if (choice === 1) {
      window.reload();
    }
  });

  window.on("closed", onClosed);

  return window;
}

export function loadSplash(window: BrowserWindow): void {
  void window.loadFile(getSplashPath());
}

export function updateSplashStatus(window: BrowserWindow | null, text: string, subText?: string): void {
  if (!window || window.isDestroyed()) return;

  const safeText = JSON.stringify(text);
  void window.webContents.executeJavaScript(`document.getElementById('status').textContent=${safeText}`);

  if (subText !== undefined) {
    const safeSubText = JSON.stringify(subText);
    void window.webContents.executeJavaScript(`document.getElementById('sub-status').textContent=${safeSubText}`);
  }
}

interface CreateTrayOptions {
  onOpen: () => void;
  onQuit: () => void;
}

export function createTray({ onOpen, onQuit }: CreateTrayOptions): Tray {
  const tray = new Tray(nativeImage.createFromPath(getTrayIconPath()));
  tray.setToolTip("Studio Console");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Console", click: onOpen },
      { type: "separator" },
      { label: "Quit", click: onQuit },
    ])
  );
  tray.on("click", onOpen);
  return tray;
}

export function installDockMenu(onOpen: () => void): void {
  if (process.platform !== "darwin") return;
  app.dock.setMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Console",
        click: onOpen,
      },
    ])
  );
}

export function showBackgroundRunningNotification(): void {
  if (!Notification.isSupported()) return;

  new Notification({
    title: "Studio Console is still running",
    body: "Lights, audio, and the control surface remain active. Quit from the Dock to shut down.",
    silent: true,
  }).show();
}

export function createShutdownWindow(): BrowserWindow | null {
  try {
    const window = new BrowserWindow({
      width: 300,
      height: 80,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    void window.loadURL(
      `data:text/html,<html><body style="background:#1f2937;color:#d1d5db;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;-webkit-app-region:drag"><p style="font-size:13px">Shutting down... Turning off studio lights</p></body></html>`
    );

    return window;
  } catch {
    return null;
  }
}
