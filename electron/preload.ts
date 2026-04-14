// Preload script — runs in renderer context with limited Node access.
// Currently minimal; extend here if you need to expose APIs to the renderer.
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getAppInfo: () => ipcRenderer.invoke("desktop:get-app-info"),
  getUpdateStatus: () => ipcRenderer.invoke("desktop:get-update-status"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:check-for-updates"),
  setOpenAtLogin: (enabled: boolean) => ipcRenderer.invoke("desktop:set-open-at-login", enabled),
});
