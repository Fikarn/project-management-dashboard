import {
  app,
  BrowserWindow,
  dialog,
  utilityProcess,
  UtilityProcess,
  Tray,
  Menu,
  nativeImage,
  screen,
  powerMonitor,
} from "electron";
import { ChildProcess, fork } from "child_process";
import path from "path";
import fs from "fs";
import http from "http";

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | UtilityProcess | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Server auto-restart tracking
let serverRestartCount = 0;
let serverRestartWindowStart = 0;
const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 60000;

// Data directory: use Electron's userData path for portable storage
const dataDir = path.join(app.getPath("userData"), "data");
const windowStatePath = path.join(app.getPath("userData"), "window-state.json");

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(windowStatePath)) {
      const state = JSON.parse(fs.readFileSync(windowStatePath, "utf-8"));
      // Clamp dimensions to sane ranges
      return {
        ...state,
        width: Math.max(400, Math.min(4000, state.width ?? 1400)),
        height: Math.max(300, Math.min(3000, state.height ?? 900)),
      };
    }
  } catch {
    /* ignore */
  }
  return { width: 1400, height: 900, isMaximized: false };
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  const state: WindowState = {
    isMaximized: win.isMaximized(),
    ...(!win.isMaximized() ? win.getBounds() : {}),
    width: win.isMaximized() ? loadWindowState().width : win.getBounds().width,
    height: win.isMaximized() ? loadWindowState().height : win.getBounds().height,
  };
  if (!win.isMaximized()) {
    const bounds = win.getBounds();
    state.x = bounds.x;
    state.y = bounds.y;
    state.width = bounds.width;
    state.height = bounds.height;
  }
  try {
    fs.writeFileSync(windowStatePath, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

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

  const handleServerExit = (code: number | null) => {
    console.log(`Server exited with code ${code}`);
    serverProcess = null;

    // Auto-restart if not quitting
    if (!isQuitting) {
      const now = Date.now();
      if (now - serverRestartWindowStart > RESTART_WINDOW_MS) {
        serverRestartCount = 0;
        serverRestartWindowStart = now;
      }

      serverRestartCount++;
      if (serverRestartCount <= MAX_RESTARTS) {
        console.warn(`Server crashed, restarting (attempt ${serverRestartCount}/${MAX_RESTARTS})...`);
        setTimeout(() => {
          if (!isQuitting) {
            startServer();
            waitForServer(15)
              .then(() => {
                mainWindow?.loadURL(URL);
              })
              .catch((err) => {
                console.error("Server restart failed:", err);
              });
          }
        }, 1000);
      } else {
        dialog.showErrorBox(
          "Server Crashed",
          `The internal server has crashed ${MAX_RESTARTS} times within a minute.\n\nPlease restart the application.`
        );
      }
    }
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

    (serverProcess as any).on("exit", handleServerExit);
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

    cp.on("exit", handleServerExit);

    serverProcess = cp;
  }
}

function waitForServer(retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let done = false;

    // Reject early if server process exits before we connect
    const onExit = (code: number | null) => {
      if (!done) {
        done = true;
        reject(new Error(`Server process exited with code ${code}`));
      }
    };
    (serverProcess as any)?.on("exit", onExit);

    const check = () => {
      if (done) return;
      const req = http.get(`${URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          done = true;
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.end();
    };
    const retry = () => {
      if (done) return;
      attempts++;
      if (attempts >= retries) {
        done = true;
        reject(new Error("Server did not start in time"));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

function createWindow(): void {
  const state = loadWindowState();

  // Validate saved position against current displays
  let usePosition = false;
  if (state.x !== undefined && state.y !== undefined) {
    const displays = screen.getAllDisplays();
    usePosition = displays.some((d) => {
      const b = d.bounds;
      return state.x! >= b.x && state.x! < b.x + b.width && state.y! >= b.y && state.y! < b.y + b.height;
    });
  }

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(usePosition ? { x: state.x, y: state.y } : {}),
    title: "Project Manager",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  // Debounced save on resize/move
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (mainWindow) saveWindowState(mainWindow);
    }, 500);
  };
  mainWindow.on("resize", debouncedSave);
  mainWindow.on("move", debouncedSave);

  // Handle unresponsive window
  mainWindow.on("unresponsive", () => {
    const choice = dialog.showMessageBoxSync(mainWindow!, {
      type: "warning",
      title: "Window Unresponsive",
      message: "The window is not responding.",
      buttons: ["Wait", "Reload"],
      defaultId: 0,
    });
    if (choice === 1) {
      mainWindow?.reload();
    }
  });

  // Windows: hide to tray instead of closing
  if (process.platform === "win32") {
    mainWindow.on("close", (e) => {
      if (!isQuitting) {
        e.preventDefault();
        if (mainWindow) saveWindowState(mainWindow);
        mainWindow?.hide();
      }
    });
  }

  mainWindow.on("close", () => {
    if (mainWindow) saveWindowState(mainWindow);
  });

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
  if (!serverProcess) return;

  if (process.platform === "win32") {
    // Windows: kill the process tree
    serverProcess.kill();
  } else {
    // macOS/Linux: SIGTERM first, SIGKILL after 2s
    serverProcess.kill("SIGTERM" as any);
    const killTimer = setTimeout(() => {
      if (serverProcess) {
        try {
          serverProcess.kill("SIGKILL" as any);
        } catch {
          // already dead
        }
      }
    }, 2000);
    const currentProcess = serverProcess;
    (currentProcess as any).on("exit", () => clearTimeout(killTimer));
  }

  serverProcess = null;
}

// Register global process error handlers for the Electron main process
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Electron main process uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Electron main process unhandled rejection:", reason);
});

app.whenReady().then(async () => {
  // Auto-start on login
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  startServer();

  // Show splash screen immediately
  createWindow();
  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, "splash.html")
    : path.join(__dirname, "splash.html");
  mainWindow?.loadFile(splashPath);
  mainWindow?.once("ready-to-show", () => mainWindow?.show());

  try {
    await waitForServer();
    mainWindow?.loadURL(URL);
  } catch (err) {
    console.error("Failed to start server:", err);
    dialog.showErrorBox(
      "Server Failed to Start",
      "The internal server could not start. Please try restarting the application.\n\n" + String(err)
    );
    stopServer();
    app.exit(1);
    return;
  }

  // Windows: create system tray so app stays alive when window is hidden
  if (process.platform === "win32") {
    createTray();
  }

  // macOS: re-open window when clicking dock icon
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Sleep/wake handling for DMX
  powerMonitor.on("suspend", () => {
    console.log("System suspending — sending DMX blackout");
    // Best-effort blackout before sleep
    const req = http.request(`${URL}/api/lights/shutdown`, { method: "POST" });
    req.on("error", () => {
      /* system is going to sleep anyway */
    });
    req.end();
  });

  powerMonitor.on("resume", () => {
    console.log("System resumed — reinitializing DMX after delay");
    // Wait for network to come back after wake
    setTimeout(() => {
      const req = http.request(
        `${URL}/api/lights/settings`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        (res) => res.resume()
      );
      req.on("error", (err) => {
        console.error("Failed to reinitialize DMX after wake:", err);
      });
      // Send empty body to trigger DMX reinit from current settings
      req.write(JSON.stringify({ dmxEnabled: true }));
      req.end();
    }, 3000);
  });
});

// macOS: keep app running when window is closed (server stays up for Companion)
// Windows: tray keeps process alive, don't quit on window close
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && process.platform !== "win32") {
    app.quit();
  }
});

app.on("before-quit", async (e) => {
  isQuitting = true;
  // Try to send DMX blackout before stopping server
  try {
    e.preventDefault();
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const req = http.request(`${URL}/api/lights/shutdown`, { method: "POST" }, (res) => {
          res.resume();
          res.on("end", resolve);
        });
        req.on("error", reject);
        req.end();
      }),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
  } catch {
    // Proceed with quit even if shutdown fails
  }
  stopServer();
  app.exit();
});
