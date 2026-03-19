import {
  app,
  BrowserWindow,
  utilityProcess,
  UtilityProcess,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import { ChildProcess, fork } from "child_process";
import path from "path";
import http from "http";

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | UtilityProcess | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Data directory: use Electron's userData path for portable storage
const dataDir = path.join(app.getPath("userData"), "data");

function getServerPath(): string {
  // In packaged app, standalone server is in resources
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone", "server.js");
  }
  // In dev, use the built standalone output
  return path.join(__dirname, "..", ".next", "standalone", "server.js");
}

function startServer(): void {
  const serverPath = getServerPath();
  const serverEnv = {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: "localhost",
    DB_DIR: dataDir,
  };

  if (app.isPackaged) {
    // In packaged app, use Electron's utilityProcess to run server.js
    // with Electron's built-in Node runtime (no external node needed)
    serverProcess = utilityProcess.fork(serverPath, [], {
      env: serverEnv,
      stdio: "pipe",
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      console.log(`[server] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[server] ${data.toString().trim()}`);
    });

    serverProcess.on("exit", (code) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;
    });
  } else {
    // In dev, use fork() which uses the system Node runtime
    const cp = fork(serverPath, [], {
      env: serverEnv,
      stdio: "pipe",
    });

    cp.stdout?.on("data", (data: Buffer) => {
      console.log(`[server] ${data.toString().trim()}`);
    });

    cp.stderr?.on("data", (data: Buffer) => {
      console.error(`[server] ${data.toString().trim()}`);
    });

    cp.on("exit", (code) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;
    });

    serverProcess = cp;
  }
}

function waitForServer(retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`${URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.end();
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) {
        reject(new Error("Server did not start in time"));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Project Manager",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Windows: hide to tray instead of closing
  if (process.platform === "win32") {
    mainWindow.on("close", (e) => {
      if (!isQuitting) {
        e.preventDefault();
        mainWindow?.hide();
      }
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "tray-icon.ico")
    : path.join(__dirname, "..", "build", "tray-icon.ico");

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("Project Manager");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  // Auto-start on login
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  startServer();

  try {
    await waitForServer();
  } catch (err) {
    console.error("Failed to start server:", err);
  }

  // Windows: create system tray so app stays alive when window is hidden
  if (process.platform === "win32") {
    createTray();
  }

  createWindow();

  // macOS: re-open window when clicking dock icon
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// macOS: keep app running when window is closed (server stays up for Companion)
// Windows: tray keeps process alive, don't quit on window close
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && process.platform !== "win32") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopServer();
});
