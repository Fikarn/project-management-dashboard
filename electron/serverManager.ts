import { ChildProcess, fork } from "child_process";
import http from "http";
import { app, dialog, utilityProcess, type UtilityProcess } from "electron";
import { getDataDir, getServerPath, PORT, URL } from "./config";

type ManagedServerProcess = ChildProcess | UtilityProcess;
type ExitListener = (code: number | null) => void;

interface ServerManagerOptions {
  isQuitting: () => boolean;
  onRestartReady: () => void;
}

export function createServerManager({ isQuitting, onRestartReady }: ServerManagerOptions) {
  let serverProcess: ManagedServerProcess | null = null;
  let restartCount = 0;
  let restartWindowStart = 0;

  const MAX_RESTARTS = 3;
  const RESTART_WINDOW_MS = 60000;

  function addExitListener(processHandle: ManagedServerProcess | null, listener: ExitListener): void {
    (processHandle as ChildProcess | null)?.on("exit", listener);
  }

  function removeExitListener(processHandle: ManagedServerProcess | null, listener: ExitListener): void {
    (processHandle as ChildProcess | null)?.removeListener("exit", listener);
  }

  function start(): void {
    const serverPath = getServerPath();
    const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "localhost",
      DB_DIR: getDataDir(),
    };

    const handleServerExit = (code: number | null) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;

      if (isQuitting()) return;

      const now = Date.now();
      if (now - restartWindowStart > RESTART_WINDOW_MS) {
        restartCount = 0;
        restartWindowStart = now;
      }

      restartCount += 1;
      if (restartCount > MAX_RESTARTS) {
        dialog.showErrorBox(
          "Server Crashed",
          `The internal server has crashed ${MAX_RESTARTS} times within a minute.\n\nPlease restart the application.`
        );
        return;
      }

      console.warn(`Server crashed, restarting (attempt ${restartCount}/${MAX_RESTARTS})...`);
      setTimeout(() => {
        if (isQuitting()) return;
        start();
        waitForServer(60)
          .then(onRestartReady)
          .catch((error) => {
            console.error("Server restart failed:", error);
          });
      }, 1000);
    };

    if (app.isPackaged) {
      const processHandle = utilityProcess.fork(serverPath, [], { env: serverEnv, stdio: "pipe" });
      processHandle.stdout?.on("data", (data: Buffer) => {
        console.log(`[server] ${data.toString().trim()}`);
      });
      processHandle.stderr?.on("data", (data: Buffer) => {
        console.error(`[server] ${data.toString().trim()}`);
      });
      addExitListener(processHandle, handleServerExit);
      serverProcess = processHandle;
      return;
    }

    const processHandle = fork(serverPath, [], { env: serverEnv, stdio: "pipe" });
    processHandle.stdout?.on("data", (data: Buffer) => {
      console.log(`[server] ${data.toString().trim()}`);
    });
    processHandle.stderr?.on("data", (data: Buffer) => {
      console.error(`[server] ${data.toString().trim()}`);
    });
    addExitListener(processHandle, handleServerExit);
    serverProcess = processHandle;
  }

  function waitForServer(retries = 30): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      let done = false;
      const currentProcess = serverProcess;

      const finish = (callback: () => void) => {
        if (done) return;
        done = true;
        removeExitListener(currentProcess, onExit);
        callback();
      };

      const onExit = (code: number | null) => {
        finish(() => reject(new Error(`Server process exited with code ${code}`)));
      };

      addExitListener(currentProcess, onExit);

      const check = () => {
        if (done) return;

        const request = http.get(`${URL}/api/health`, (response) => {
          if (response.statusCode === 200) {
            finish(resolve);
          } else {
            retry();
          }
        });
        request.on("error", retry);
        request.end();
      };

      const retry = () => {
        if (done) return;
        attempts += 1;
        if (attempts >= retries) {
          finish(() => reject(new Error("Server did not start in time")));
          return;
        }
        setTimeout(check, 500);
      };

      check();
    });
  }

  function stop(): void {
    if (!serverProcess) return;

    if (process.platform === "win32") {
      serverProcess.kill();
      serverProcess = null;
      return;
    }

    serverProcess.kill();
    const pid = serverProcess.pid;
    const trackedProcess = serverProcess;
    const killTimer = setTimeout(() => {
      if (pid === undefined) return;
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Process already exited.
      }
    }, 2000);
    addExitListener(trackedProcess, () => clearTimeout(killTimer));
    serverProcess = null;
  }

  function getProcess(): ManagedServerProcess | null {
    return serverProcess;
  }

  return {
    start,
    waitForServer,
    stop,
    getProcess,
  };
}
