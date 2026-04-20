import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const includeNative = process.argv.includes("--native");
const nativeAppPath = path.join(rootDir, "release", "native", "macos", "SSE ExEd Studio Control Native.app");
const legacyUrl = "http://127.0.0.1:3000";

let shuttingDown = false;
let browserProcess = null;
let electronProcess = null;
let nativeLauncher = null;

function log(message) {
  console.log(`[parity] ${message}`);
}

function spawnManaged(command, args, options = {}) {
  return spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    ...options,
  });
}

async function serverReady() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(legacyUrl, {
      signal: controller.signal,
      redirect: "manual",
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await serverReady()) {
      return;
    }

    if (browserProcess && browserProcess.exitCode !== null) {
      throw new Error(`Legacy browser dev server exited early with code ${browserProcess.exitCode}.`);
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for the legacy UI server at ${legacyUrl}.`);
}

function terminateChild(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGINT");
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log(`Shutting down parity launcher (${signal}).`);
  terminateChild(electronProcess);
  terminateChild(browserProcess);
  terminateChild(nativeLauncher);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function ensureLegacyServer() {
  if (await serverReady()) {
    log(`Using existing legacy UI server at ${legacyUrl}.`);
    return;
  }

  log("Starting legacy Next dev server on port 3000.");
  browserProcess = spawnManaged(npmCommand, ["run", "legacy:browser:dev"]);
  await waitForServer();
  log("Legacy UI server is ready.");
}

async function openNativeApp() {
  if (!includeNative) {
    return;
  }

  if (process.platform !== "darwin") {
    log("Skipping native app launch because the packaged .app benchmark is only available on macOS.");
    return;
  }

  log("Opening packaged native benchmark app.");
  nativeLauncher = spawnManaged("open", [nativeAppPath]);
}

async function main() {
  await ensureLegacyServer();
  await openNativeApp();

  log("Opening legacy Electron benchmark.");
  electronProcess = spawnManaged(npmCommand, ["run", "legacy:electron:dev:open"]);
  electronProcess.on("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      log(`Legacy Electron benchmark exited with code ${code}.`);
      shutdown("electron-exit");
      process.exitCode = code;
    }
  });

  if (browserProcess) {
    browserProcess.on("exit", (code) => {
      if (!shuttingDown && code && code !== 0) {
        log(`Legacy browser dev server exited with code ${code}.`);
        shutdown("browser-exit");
        process.exitCode = code;
      }
    });
  }

  await new Promise((resolve) => {
    electronProcess.on("exit", resolve);
  });

  if (browserProcess) {
    shutdown("electron-closed");
  }
}

main().catch((error) => {
  console.error(`[parity] ${error.message}`);
  shutdown("error");
  process.exitCode = 1;
});
