interface DesktopAppInfoSnapshot {
  name: string;
  version: string;
  platform: string;
  isPackaged: boolean;
  openAtLoginEnabled: boolean;
  closeBehavior: "confirm-quit";
}

interface DesktopUpdateStatusSnapshot {
  status: "idle" | "checking" | "available" | "downloaded" | "not-available" | "unavailable" | "error";
  message: string;
  version: string | null;
}

interface ElectronAPI {
  isElectron: boolean;
  getAppInfo: () => Promise<DesktopAppInfoSnapshot>;
  getUpdateStatus: () => Promise<DesktopUpdateStatusSnapshot>;
  checkForUpdates: () => Promise<DesktopUpdateStatusSnapshot>;
  setOpenAtLogin: (enabled: boolean) => Promise<DesktopAppInfoSnapshot>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
