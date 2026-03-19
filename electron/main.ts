import { app, BrowserWindow, Tray, Menu, nativeImage, utilityProcess, UtilityProcess } from "electron";
import { spawn, ChildProcess, fork } from "child_process";
import path from "path";
import http from "http";

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | UtilityProcess | null = null;

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

  mainWindow.on("close", (e) => {
    // Minimize to tray on close instead of quitting
    if (tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray(): void {
  // Use a simple template tray icon
  const icon = nativeImage.createEmpty();
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
    {
      label: "Restart Server",
      click: () => {
        stopServer();
        startServer();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        tray = null; // Allow window close to proceed
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
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
  createTray();

  try {
    await waitForServer();
  } catch (err) {
    console.error("Failed to start server:", err);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopServer();
});
