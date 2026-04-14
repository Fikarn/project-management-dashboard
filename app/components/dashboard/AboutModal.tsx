"use client";

import { useEffect, useState } from "react";
import Modal from "../shared/Modal";

type CloseBehavior = "confirm-quit";

interface AppInfoSnapshot {
  name: string;
  version: string;
  platform: string;
  isPackaged: boolean;
  openAtLoginEnabled: boolean;
  closeBehavior: CloseBehavior;
}

interface UpdateStatusSnapshot {
  status: "idle" | "checking" | "available" | "downloaded" | "not-available" | "unavailable" | "error";
  message: string;
  version: string | null;
}

interface AboutModalProps {
  onClose: () => void;
}

function describePlatform(platform: string): string {
  switch (platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    default:
      return platform;
  }
}

function describeCloseBehavior(closeBehavior: CloseBehavior): string {
  switch (closeBehavior) {
    case "confirm-quit":
      return "Closing the main window shows a warning, then fully quits the app if confirmed. Downloaded updates install after the app quits.";
    default:
      return "Closing the main window quits the app.";
  }
}

const FALLBACK_APP_INFO: AppInfoSnapshot = {
  name: "SSE ExEd Studio Control",
  version: "Development mode",
  platform: "browser",
  isPackaged: false,
  openAtLoginEnabled: false,
  closeBehavior: "confirm-quit",
};

const FALLBACK_UPDATE_STATUS: UpdateStatusSnapshot = {
  status: "unavailable",
  message: "Desktop update controls are available only in the packaged app.",
  version: null,
};

export default function AboutModal({ onClose }: AboutModalProps) {
  const [appInfo, setAppInfo] = useState<AppInfoSnapshot>(FALLBACK_APP_INFO);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusSnapshot>(FALLBACK_UPDATE_STATUS);
  const [checking, setChecking] = useState(false);
  const [hasElectronApi, setHasElectronApi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let updateStatusTimer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      const electronApi = window.electronAPI;
      setHasElectronApi(Boolean(electronApi));
      if (!electronApi) return;

      try {
        const [info, status] = await Promise.all([electronApi.getAppInfo(), electronApi.getUpdateStatus()]);
        if (cancelled) return;
        setAppInfo(info);
        setUpdateStatus(status);
        updateStatusTimer = setInterval(() => {
          electronApi
            .getUpdateStatus()
            .then((nextStatus) => {
              if (!cancelled) {
                setUpdateStatus(nextStatus);
              }
            })
            .catch(() => {});
        }, 5000);
      } catch {
        if (cancelled) return;
        setUpdateStatus({
          status: "error",
          message: "Failed to load desktop app information.",
          version: null,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (updateStatusTimer) clearInterval(updateStatusTimer);
    };
  }, []);

  async function handleCheckForUpdates() {
    if (!hasElectronApi || !window.electronAPI) return;

    setChecking(true);
    try {
      const status = await window.electronAPI.checkForUpdates();
      setUpdateStatus(status);
    } finally {
      setChecking(false);
    }
  }

  async function handleToggleOpenAtLogin() {
    if (!hasElectronApi || !window.electronAPI) return;

    try {
      const nextInfo = await window.electronAPI.setOpenAtLogin(!appInfo.openAtLoginEnabled);
      setAppInfo(nextInfo);
    } catch {
      setUpdateStatus({
        status: "error",
        message: "Failed to update the open-at-login preference.",
        version: updateStatus.version,
      });
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="About SSE ExEd Studio Control">
      <div className="w-full max-w-lg animate-scale-in rounded-[22px] border border-studio-700/80 bg-studio-850/95 p-6 shadow-modal backdrop-blur">
        <div className="mb-4">
          <p className="text-xxs font-semibold uppercase tracking-[0.22em] text-accent-blue/80">About</p>
          <h2 className="mt-2 text-lg font-semibold text-studio-100">{appInfo.name}</h2>
          <p className="mt-1 text-sm text-studio-400">Version and update status for the installed desktop app.</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-card bg-studio-900/70 px-3 py-2">
            <span className="text-studio-400">Version</span>
            <span className="font-mono text-studio-200">{appInfo.version}</span>
          </div>
          <div className="flex items-center justify-between rounded-card bg-studio-900/70 px-3 py-2">
            <span className="text-studio-400">Platform</span>
            <span className="text-studio-200">{describePlatform(appInfo.platform)}</span>
          </div>
          <div className="flex items-center justify-between rounded-card bg-studio-900/70 px-3 py-2">
            <span className="text-studio-400">Build</span>
            <span className="text-studio-200">
              {appInfo.isPackaged ? "Packaged desktop app" : "Development runtime"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-card bg-studio-900/70 px-3 py-2">
            <span className="text-studio-400">Open at login</span>
            <span className="text-studio-200">{appInfo.openAtLoginEnabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleToggleOpenAtLogin()}
          disabled={!hasElectronApi}
          className="mt-3 rounded-badge border border-studio-700 bg-studio-900/70 px-4 py-2 text-sm font-medium text-studio-200 transition-colors hover:border-studio-600 hover:bg-studio-850 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {appInfo.openAtLoginEnabled ? "Disable open at login" : "Enable open at login"}
        </button>

        <div className="mt-4 rounded-card border border-studio-700/70 bg-studio-900/50 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-studio-400">Updates</h3>
          <p className="text-sm text-studio-300">{updateStatus.message}</p>
          {updateStatus.version ? (
            <p className="mt-2 text-xs text-studio-500">Latest referenced version: {updateStatus.version}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCheckForUpdates()}
            disabled={checking || !hasElectronApi}
            className="mt-3 rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? "Checking..." : "Check for updates"}
          </button>
        </div>

        <div className="mt-4 rounded-card border border-studio-700/70 bg-studio-900/50 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-studio-400">Quit Behavior</h3>
          <p className="text-xs leading-5 text-studio-500">{describeCloseBehavior(appInfo.closeBehavior)}</p>
        </div>
      </div>
    </Modal>
  );
}
