import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const legacyUrl = "http://127.0.0.1:3000";
const outputRoot = path.join(rootDir, "artifacts", "parity", "legacy");

const sceneArg = process.argv.find((value) => value.startsWith("--scene="));
const resolutionArg = process.argv.find((value) => value.startsWith("--resolution="));

const sceneFilter = sceneArg ? sceneArg.slice("--scene=".length) : null;
const resolutionFilter = resolutionArg ? resolutionArg.slice("--resolution=".length) : "workstation";

const resolutions = {
  workstation: { width: 2560, height: 1440, directory: "operator-2560x1440" },
};

const sceneConfig = {
  "shortcuts-open": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-planning-populated-db.json"),
    route: "/",
    initLocalStorage: {
      hasSeenShortcutHint: "1",
      "studio-console-ui-scale-v2": "1",
    },
    waitTexts: ["Operator Help", "Keyboard shortcuts", "Data Safety"],
    outputName: "shortcuts-open.png",
    prepare: async (page) => {
      await page.getByTitle("Keyboard shortcuts").click();
      await page.getByRole("dialog", { name: "Keyboard Shortcuts & Help" }).waitFor({
        state: "visible",
        timeout: 20000,
      });
    },
  },
  "about-open": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-planning-populated-db.json"),
    route: "/",
    initLocalStorage: {
      hasSeenShortcutHint: "1",
      "studio-console-ui-scale-v2": "1",
    },
    waitTexts: ["About", "Version", "Updates", "Quit Behavior"],
    outputName: "about-open.png",
    prepare: async (page) => {
      await page.getByTitle("About SSE ExEd Studio Control").click();
      await page.getByRole("dialog", { name: "About SSE ExEd Studio Control" }).waitFor({
        state: "visible",
        timeout: 20000,
      });
    },
  },
  "lighting-populated": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-lighting-populated-db.json"),
    route: "/",
    waitTexts: ["Lighting control stays front and center.", "Control Rail"],
    outputName: "lighting-populated.png",
  },
  "audio-populated": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-audio-populated-db.json"),
    route: "/",
    waitTexts: ["Selected Strip", "RME Readiness", "Operator Notes"],
    outputName: "audio-populated.png",
  },
  "setup-required": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-setup-required-db.json"),
    route: "/",
    initLocalStorage: {
      hasSeenShortcutHint: "1",
      "studio-console-ui-scale-v2": "1",
    },
    clearLocalStorageKeys: ["hasSeenWelcome"],
    waitTexts: [
      "SSE ExEd Studio Control Commissioning",
      "Welcome to SSE ExEd Studio Control",
      "Get Started",
    ],
    outputName: "setup-required.png",
  },
  "setup-ready": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-setup-ready-db.json"),
    route: "/setup",
    waitTexts: [
      "Control surface setup",
      "Generate Companion profile",
      "Stream Deck+ replica",
    ],
    outputName: "setup-ready.png",
  },
  "setup-control-selected": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-setup-ready-db.json"),
    route: "/setup",
    waitTexts: [
      "Control surface setup",
      "Generate Companion profile",
      "Stream Deck+ replica",
    ],
    outputName: "setup-control-selected.png",
    prepare: async (page) => {
      await page.getByRole("button", { name: "New Proj" }).click();
      await page.getByText("POST", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
      await page.getByRole("button", { name: "Copy URL" }).waitFor({ state: "visible", timeout: 20000 });
    },
  },
  "setup-control-dial-selected": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-setup-ready-db.json"),
    route: "/setup",
    waitTexts: [
      "Control surface setup",
      "Generate Companion profile",
      "Stream Deck+ replica",
    ],
    outputName: "setup-control-dial-selected.png",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Dial 1: Project" }).click();
      await page.getByText("Dial Left", { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Dial Right", { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
      await page.getByRole("button", { name: "Copy URL" }).first().waitFor({ state: "visible", timeout: 20000 });
    },
  },
  "setup-control-page-nav": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-setup-ready-db.json"),
    route: "/setup",
    waitTexts: [
      "Control surface setup",
      "Generate Companion profile",
      "Stream Deck+ replica",
    ],
    outputName: "setup-control-page-nav.png",
    prepare: async (page) => {
      await page.getByRole("button", { name: "TASKS >>" }).click();
      await page.getByText("Companion Native Action", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Page Jump", { exact: false }).waitFor({ state: "visible", timeout: 20000 });
    },
  },
  "support-open": {
    fixturePath: path.join(rootDir, "native", "rust-engine", "fixtures", "parity-setup-ready-db.json"),
    route: "/setup",
    waitTexts: [
      "Control surface setup",
      "Gatekeeper / SmartScreen help",
      "Hide manual setup fallback",
    ],
    outputName: "support-open.png",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Show manual setup fallback" }).click();
      await page.getByRole("button", { name: "Show manual setup fallback" }).waitFor({ state: "hidden", timeout: 20000 });
      await page.getByRole("button", { name: "Hide manual setup fallback" }).waitFor({ state: "visible", timeout: 20000 });
      await page.getByRole("button", { name: /Gatekeeper \/ SmartScreen help/i }).click();
      await page.getByText("If the app is blocked, right-click the app, choose", { exact: false }).waitFor({
        state: "visible",
        timeout: 20000,
      });
    },
  },
};

let browserProcess = null;
let startedServer = false;

function log(message) {
  console.log(`[legacy-parity] ${message}`);
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

async function ensureLegacyServer() {
  if (await serverReady()) {
    log(`Using existing legacy UI server at ${legacyUrl}.`);
    return;
  }

  log("Starting legacy Next dev server on port 3000.");
  browserProcess = spawnManaged(npmCommand, ["run", "legacy:browser:dev"]);
  startedServer = true;
  await waitForServer();
  log("Legacy UI server is ready.");
}

async function restoreFixture(fixturePath) {
  const raw = await readFile(fixturePath, "utf8");
  const body = JSON.parse(raw);
  const response = await fetch(`${legacyUrl}/api/backup/restore`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to restore fixture ${fixturePath}: ${response.status} ${await response.text()}`);
  }
}

async function captureScene(sceneName, resolution) {
  const config = sceneConfig[sceneName];
  if (!config) {
    throw new Error(`Unknown scene '${sceneName}'.`);
  }

  if (config.fixturePath) {
    await restoreFixture(config.fixturePath);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: resolution.width, height: resolution.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    const page = await context.newPage();

    if (config.initLocalStorage || config.clearLocalStorageKeys) {
      await context.addInitScript((storageState) => {
        if (storageState.clearKeys) {
          for (const key of storageState.clearKeys) {
            window.localStorage.removeItem(key);
          }
        }

        if (storageState.values) {
          for (const [key, value] of Object.entries(storageState.values)) {
            window.localStorage.setItem(key, value);
          }
        }
      }, {
        values: config.initLocalStorage ?? null,
        clearKeys: config.clearLocalStorageKeys ?? null,
      });
    }

    await page.goto(new URL(config.route ?? "/", legacyUrl).toString(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    if (config.prepare) {
      await config.prepare(page);
      await page.waitForTimeout(400);
    }

    for (const text of config.waitTexts) {
      await page.getByText(text, { exact: true }).waitFor({ state: "visible", timeout: 20000 });
    }

    await page.waitForTimeout(800);

    const outputDir = path.join(outputRoot, resolution.directory);
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, config.outputName);
    await page.screenshot({ path: outputPath });
    log(`Captured ${sceneName} -> ${outputPath}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const sceneNames = sceneFilter ? [sceneFilter] : Object.keys(sceneConfig);
  const resolution = resolutions[resolutionFilter];

  if (!resolution) {
    throw new Error(`Unknown resolution '${resolutionFilter}'.`);
  }

  await ensureLegacyServer();

  for (const sceneName of sceneNames) {
    await captureScene(sceneName, resolution);
  }
}

try {
  await main();
} finally {
  if (startedServer && browserProcess && browserProcess.exitCode === null) {
    browserProcess.kill("SIGINT");
  }
}
