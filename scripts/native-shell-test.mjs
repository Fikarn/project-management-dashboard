import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(rootDir, "native", "build");
const nativeBuildScript = path.join(rootDir, "scripts", "native-build.mjs");
const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");
const lastTestsFailedLogPath = path.join(buildDir, "Testing", "Temporary", "LastTestsFailed.log");
const lastTestLogPath = path.join(buildDir, "Testing", "Temporary", "LastTest.log");

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readCacheEntry(name) {
  if (!existsSync(cmakeCachePath)) {
    return null;
  }

  const cacheText = readFileSync(cmakeCachePath, "utf8");
  const pattern = new RegExp(`^${escapeRegExp(name)}(?::[^=]+)?=(.*)$`, "m");
  const match = cacheText.match(pattern);
  return match ? match[1].trim() : null;
}

function resolveBuildConfiguration() {
  const requestedConfig = process.env.SSE_NATIVE_TEST_CONFIG?.trim();
  const configuredTypes = readCacheEntry("CMAKE_CONFIGURATION_TYPES")
    ?.split(";")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredTypes?.length) {
    if (requestedConfig) {
      if (!configuredTypes.includes(requestedConfig)) {
        throw new Error(
          `Requested SSE_NATIVE_TEST_CONFIG='${requestedConfig}' is not available in CMAKE_CONFIGURATION_TYPES=${configuredTypes.join(", ")}.`
        );
      }

      return requestedConfig;
    }

    return configuredTypes.includes("Debug") ? "Debug" : configuredTypes[0];
  }

  const buildType = readCacheEntry("CMAKE_BUILD_TYPE");
  return requestedConfig || buildType || null;
}

function printLogTail(filePath, label, maxLines = 200) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const tail = lines.slice(-maxLines).join("\n").trim();

  if (!tail) {
    return;
  }

  console.error(`\n===== ${label} (${path.relative(rootDir, filePath)}) =====`);
  console.error(tail);
  console.error(`===== end ${label} =====\n`);
}

function runOrExit(command, args, env = {}) {
  const status = run(command, args, env);

  if (status !== 0) {
    process.exit(status);
  }
}

runOrExit("node", [nativeBuildScript, "--configure-only"]);
const buildConfiguration = resolveBuildConfiguration();
const buildArgs = [
  "--build",
  buildDir,
  "--target",
  "sse_exed_native_qmltests",
  "--parallel",
  String(Math.max(availableParallelism(), 1)),
];
const ctestArgs = ["--test-dir", buildDir, "--output-on-failure", "-R", "^sse_exed_native_qmltests$"];

if (buildConfiguration) {
  console.log(`Running native shell tests with CMake configuration '${buildConfiguration}'.`);
  buildArgs.splice(4, 0, "--config", buildConfiguration);
  ctestArgs.push("-C", buildConfiguration);
}

runOrExit("cmake", buildArgs);
const ctestStatus = run("ctest", ctestArgs, {
  QT_QPA_PLATFORM: "offscreen",
  QML_DISABLE_DISK_CACHE: "1",
});

if (ctestStatus !== 0) {
  console.error("Native shell tests failed. Printing the latest CTest logs for easier CI diagnosis.");
  printLogTail(lastTestsFailedLogPath, "LastTestsFailed");
  printLogTail(lastTestLogPath, "LastTest");
  process.exit(ctestStatus);
}
