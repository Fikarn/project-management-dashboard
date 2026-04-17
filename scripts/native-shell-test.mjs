import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(rootDir, "native", "build");
const nativeBuildScript = path.join(rootDir, "scripts", "native-build.mjs");
const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");

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

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
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

run("node", [nativeBuildScript, "--configure-only"]);
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

run("cmake", buildArgs);
run("ctest", ctestArgs, {
  QT_QPA_PLATFORM: "offscreen",
  QML_DISABLE_DISK_CACHE: "1",
});
