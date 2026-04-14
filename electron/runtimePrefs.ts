import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

interface RuntimePrefs {
  openAtLoginInitialized?: boolean;
}

function getRuntimePrefsPath(): string {
  return path.join(app.getPath("userData"), "runtime-prefs.json");
}

function readRuntimePrefs(): RuntimePrefs {
  const prefsPath = getRuntimePrefsPath();
  if (!existsSync(prefsPath)) return {};

  try {
    return JSON.parse(readFileSync(prefsPath, "utf-8")) as RuntimePrefs;
  } catch {
    return {};
  }
}

function writeRuntimePrefs(prefs: RuntimePrefs): void {
  try {
    writeFileSync(getRuntimePrefsPath(), JSON.stringify(prefs, null, 2));
  } catch {
    // Ignore preference write failures and continue with runtime defaults.
  }
}

export function ensureDefaultOpenAtLoginEnabled(): void {
  const prefs = readRuntimePrefs();
  if (prefs.openAtLoginInitialized) return;

  try {
    app.setLoginItemSettings({ openAtLogin: true });
    writeRuntimePrefs({ ...prefs, openAtLoginInitialized: true });
  } catch {
    // Ignore OS-specific login item failures.
  }
}
