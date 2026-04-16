import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readySmokeFixturePath = path.join(rootDir, "native", "rust-engine", "fixtures", "dashboard-ready-db.json");

function resolvePathFromRoot(value) {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value) ? value : path.join(rootDir, value);
}

function resolveShellExecutable() {
  const envOverride = resolvePathFromRoot(process.env.SSE_NATIVE_SHELL_PATH);
  if (envOverride && existsSync(envOverride)) {
    return envOverride;
  }

  const candidates =
    process.platform === "darwin"
      ? [
          path.join(
            rootDir,
            "native",
            "build",
            "qt-shell",
            "sse_exed_native.app",
            "Contents",
            "MacOS",
            "sse_exed_native"
          ),
        ]
      : process.platform === "win32"
        ? [
            path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native.exe"),
            path.join(rootDir, "native", "build", "qt-shell", "Debug", "sse_exed_native.exe"),
            path.join(rootDir, "native", "build", "qt-shell", "Release", "sse_exed_native.exe"),
            path.join(rootDir, "native", "build", "sse_exed_native.exe"),
          ]
        : [
            path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native"),
            path.join(rootDir, "native", "build", "sse_exed_native"),
          ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function readFlag(name) {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function scenarioDefaults(scenario) {
  switch (scenario) {
    case "success":
      return { expectedExitCode: 0, expectedCode: null, expectedEnginePath: null, expectedTarget: "dashboard" };
    case "clean-start":
      return { expectedExitCode: 0, expectedCode: null, expectedEnginePath: null, expectedTarget: "commissioning" };
    case "bundled-engine":
      return { expectedExitCode: 0, expectedCode: null, expectedEnginePath: null, expectedTarget: "dashboard" };
    case "restart":
      return { expectedExitCode: 0, expectedCode: null, expectedEnginePath: null, expectedTarget: "dashboard" };
    case "restart-clean-start":
      return { expectedExitCode: 0, expectedCode: null, expectedEnginePath: null, expectedTarget: "commissioning" };
    case "graceful-stop":
      return { expectedExitCode: 0, expectedCode: null, expectedEnginePath: null, expectedTarget: "dashboard" };
    case "protocol-mismatch":
      return { expectedExitCode: 1, expectedCode: "PROTOCOL_MISMATCH", expectedEnginePath: null, expectedTarget: null };
    case "runtime-dir-failure":
      return {
        expectedExitCode: 1,
        expectedCode: "RUNTIME_DIRECTORY_ERROR",
        expectedEnginePath: null,
        expectedTarget: null,
      };
    case "corrupt-storage":
      return { expectedExitCode: 1, expectedCode: "BOOTSTRAP_FAILED", expectedEnginePath: null, expectedTarget: null };
    case "watchdog-timeout":
      return { expectedExitCode: 1, expectedCode: "STARTUP_TIMEOUT", expectedEnginePath: null, expectedTarget: null };
    default:
      throw new Error(`Unsupported smoke scenario: ${scenario}`);
  }
}

function prepareWatchdogTimeoutEngine(smokeRoot) {
  if (process.platform === "win32") {
    const stallScriptPath = path.join(smokeRoot, "stall-engine.cmd");
    writeFileSync(stallScriptPath, '@echo off\r\npowershell -NoProfile -Command "Start-Sleep -Seconds 20"\r\n', "utf8");
    return stallScriptPath;
  }

  const stallScriptPath = path.join(smokeRoot, "stall-engine.sh");
  writeFileSync(stallScriptPath, "#!/bin/sh\nsleep 20\n", "utf8");
  chmodSync(stallScriptPath, 0o755);
  return stallScriptPath;
}

function prepareScenario(scenario, smokeRoot) {
  const appDataDir = path.join(smokeRoot, "app-data");
  const logsDir = path.join(smokeRoot, "logs");
  const env = {};

  if (scenario === "runtime-dir-failure") {
    mkdirSync(smokeRoot, { recursive: true });
    writeFileSync(appDataDir, "block app data dir creation\n", "utf8");
    mkdirSync(logsDir, { recursive: true });
    return { appDataDir, logsDir, env };
  }

  mkdirSync(appDataDir, { recursive: true });
  mkdirSync(logsDir, { recursive: true });

  if (scenario !== "clean-start" && scenario !== "restart-clean-start" && existsSync(readySmokeFixturePath)) {
    env.SSE_LEGACY_DB_PATH = readySmokeFixturePath;
  }

  if (scenario === "clean-start" || scenario === "restart-clean-start") {
    env.SSE_DISABLE_AUTO_IMPORT = "1";
  }

  if (scenario === "protocol-mismatch") {
    env.SSE_PROTOCOL_VERSION = "999";
  }

  if (scenario === "corrupt-storage") {
    const dbPath = path.join(appDataDir, "studio-control.sqlite3");
    writeFileSync(dbPath, "this is not a sqlite database\n", "utf8");
  }

  if (scenario === "watchdog-timeout") {
    env.SSE_ENGINE_PATH = prepareWatchdogTimeoutEngine(smokeRoot);
  }

  return { appDataDir, logsDir, env };
}

function resolveEngineExecutable() {
  return process.platform === "win32"
    ? path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine.exe")
    : path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine");
}

function prepareBundledShell(shellExecutable, smokeRoot) {
  const engineExecutable = resolveEngineExecutable();
  if (!existsSync(engineExecutable)) {
    throw new Error(`Native engine executable not found at ${engineExecutable}. Run \`npm run native:build\` first.`);
  }

  if (process.platform === "darwin") {
    const bundleRoot = shellExecutable.split(".app/")[0] + ".app";
    const bundledApp = path.join(smokeRoot, "bundled", path.basename(bundleRoot));
    cpSync(bundleRoot, bundledApp, { recursive: true });
    const bundledShell = path.join(bundledApp, "Contents", "MacOS", "sse_exed_native");
    const bundledEngine = path.join(bundledApp, "Contents", "MacOS", path.basename(engineExecutable));
    copyFileSync(engineExecutable, bundledEngine);
    chmodSync(bundledEngine, statSync(engineExecutable).mode);
    return {
      shellExecutable: bundledShell,
      expectedEnginePath: bundledEngine,
    };
  }

  const bundledDir = path.join(smokeRoot, "bundled");
  mkdirSync(bundledDir, { recursive: true });
  const bundledShell = path.join(bundledDir, path.basename(shellExecutable));
  const bundledEngine = path.join(bundledDir, path.basename(engineExecutable));
  copyFileSync(shellExecutable, bundledShell);
  copyFileSync(engineExecutable, bundledEngine);
  chmodSync(bundledShell, statSync(shellExecutable).mode);
  chmodSync(bundledEngine, statSync(engineExecutable).mode);
  return {
    shellExecutable: bundledShell,
    expectedEnginePath: bundledEngine,
  };
}

const resolvedShellExecutable = resolveShellExecutable();
if (!resolvedShellExecutable) {
  console.error("Native shell executable not found. Run `npm run native:build` first.");
  process.exit(1);
}

const scenario = readFlag("--scenario") ?? "success";
const defaults = scenarioDefaults(scenario);
const expectedExitCode = Number.parseInt(readFlag("--expected-exit-code") ?? String(defaults.expectedExitCode), 10);
const expectedCode = readFlag("--expected-code") ?? defaults.expectedCode;
const expectedTarget = readFlag("--expected-target") ?? defaults.expectedTarget;

const explicitSmokeRoot = resolvePathFromRoot(process.env.SSE_NATIVE_SMOKE_DIR);
const smokeRoot = explicitSmokeRoot ?? mkdtempSync(path.join(os.tmpdir(), "sse-qt-shell-smoke-"));

rmSync(smokeRoot, { force: true, recursive: true });
mkdirSync(smokeRoot, { recursive: true });

const prepared = prepareScenario(scenario, smokeRoot);
const shellRun =
  scenario === "bundled-engine"
    ? prepareBundledShell(resolvedShellExecutable, smokeRoot)
    : { shellExecutable: resolvedShellExecutable, expectedEnginePath: null };

const commandArgs = [];
if (process.platform !== "win32") {
  commandArgs.push("-platform", "offscreen");
}
commandArgs.push("--smoke-test");
if (scenario === "restart" || scenario === "restart-clean-start" || scenario === "graceful-stop") {
  const smokeAction = scenario.startsWith("restart") ? "restart" : "graceful-stop";
  commandArgs.push(`--smoke-action=${smokeAction}`);
}

console.log(`Running native smoke test from ${shellRun.shellExecutable}`);
console.log(`Smoke scenario: ${scenario}`);
console.log(`Smoke test runtime directory: ${smokeRoot}`);

const result = spawnSync(shellRun.shellExecutable, commandArgs, {
  cwd: scenario === "bundled-engine" ? smokeRoot : rootDir,
  encoding: "utf8",
  env: {
    ...process.env,
    ...prepared.env,
    SSE_APP_DATA_DIR: prepared.appDataDir,
    SSE_LOG_DIR: prepared.logsDir,
  },
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.error) {
  throw result.error;
}

const actualExitCode = result.status ?? 1;
if (actualExitCode !== expectedExitCode) {
  console.error(`Smoke scenario '${scenario}' exited with ${actualExitCode}, expected ${expectedExitCode}.`);
  process.exit(1);
}

if (expectedCode) {
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!combinedOutput.includes(expectedCode)) {
    console.error(`Smoke scenario '${scenario}' did not emit expected code '${expectedCode}'.`);
    process.exit(1);
  }
}

if (shellRun.expectedEnginePath) {
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!combinedOutput.includes(`Starting engine: ${shellRun.expectedEnginePath}`)) {
    console.error(
      `Smoke scenario '${scenario}' did not launch the bundled engine at '${shellRun.expectedEnginePath}'.`
    );
    process.exit(1);
  }
}

if (expectedTarget) {
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!combinedOutput.includes(`target=${expectedTarget}`)) {
    console.error(`Smoke scenario '${scenario}' did not reach expected target '${expectedTarget}'.`);
    process.exit(1);
  }
}

process.exit(0);
