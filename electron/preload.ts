// Preload script — runs in renderer context with limited Node access.
// Currently minimal; extend here if you need to expose APIs to the renderer.
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
});
