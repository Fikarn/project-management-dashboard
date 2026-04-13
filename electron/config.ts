import { app } from "electron";
import path from "path";

export const PORT = 3000;
export const URL = `http://localhost:${PORT}`;

export function getDataDir(): string {
  return path.join(app.getPath("userData"), "data");
}

export function getWindowStatePath(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

export function getServerPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone", "server.js");
  }
  return path.join(__dirname, "..", ".next", "standalone", "server.js");
}

export function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

export function getSplashPath(): string {
  return path.join(__dirname, "splash.html");
}

export function getTrayIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "tray-icon.ico")
    : path.join(__dirname, "..", "build", "tray-icon.ico");
}
