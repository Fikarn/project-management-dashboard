import { app, BrowserWindow } from "electron";

const URL = "http://localhost:3000";

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1400, height: 900 });
  win.loadURL(URL);
});

app.on("window-all-closed", () => app.quit());
