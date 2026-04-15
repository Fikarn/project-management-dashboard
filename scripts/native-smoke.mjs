import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const shellExecutable = resolveShellExecutable();
if (!shellExecutable) {
  console.error("Native shell executable not found. Run `npm run native:build` first.");
  process.exit(1);
}

const explicitSmokeRoot = resolvePathFromRoot(process.env.SSE_NATIVE_SMOKE_DIR);
const smokeRoot = explicitSmokeRoot ?? mkdtempSync(path.join(os.tmpdir(), "sse-qt-shell-smoke-"));

rmSync(smokeRoot, { force: true, recursive: true });
mkdirSync(smokeRoot, { recursive: true });

const appDataDir = path.join(smokeRoot, "app-data");
const logsDir = path.join(smokeRoot, "logs");

mkdirSync(appDataDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });

const commandArgs = [];
if (process.platform !== "win32") {
  commandArgs.push("-platform", "offscreen");
}
commandArgs.push("--smoke-test");

console.log(`Running native smoke test from ${shellExecutable}`);
console.log(`Smoke test runtime directory: ${smokeRoot}`);

const result = spawnSync(shellExecutable, commandArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    SSE_APP_DATA_DIR: appDataDir,
    SSE_LOG_DIR: logsDir,
  },
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
