import { BrowserWindow, screen } from "electron";
import fs from "fs";
import { getWindowStatePath } from "./config";

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export function loadWindowState(): WindowState {
  const windowStatePath = getWindowStatePath();

  try {
    if (fs.existsSync(windowStatePath)) {
      const state = JSON.parse(fs.readFileSync(windowStatePath, "utf-8"));
      return {
        ...state,
        width: Math.max(400, Math.min(4000, state.width ?? 1400)),
        height: Math.max(300, Math.min(3000, state.height ?? 900)),
      };
    }
  } catch {
    // Ignore invalid state and fall back to defaults.
  }

  return { width: 1400, height: 900, isMaximized: false };
}

export function saveWindowState(window: BrowserWindow): void {
  if (window.isDestroyed()) return;

  const currentBounds = window.getBounds();
  const persistedState = loadWindowState();
  const state: WindowState = {
    isMaximized: window.isMaximized(),
    width: window.isMaximized() ? persistedState.width : currentBounds.width,
    height: window.isMaximized() ? persistedState.height : currentBounds.height,
  };

  if (!window.isMaximized()) {
    state.x = currentBounds.x;
    state.y = currentBounds.y;
    state.width = currentBounds.width;
    state.height = currentBounds.height;
  }

  try {
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state));
  } catch {
    // Ignore best-effort persistence failures.
  }
}

export function shouldUseSavedPosition(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return false;

  return screen.getAllDisplays().some((display) => {
    const bounds = display.bounds;
    return (
      state.x! >= bounds.x &&
      state.x! < bounds.x + bounds.width &&
      state.y! >= bounds.y &&
      state.y! < bounds.y + bounds.height
    );
  });
}
