import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const smokeTest = args.has("--smoke-test");

const smokeFixturePath = path.join(rootDir, "native", "rust-engine", "fixtures", "dashboard-ready-db.json");

function readFlag(name) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function normalizeTargetPlatform(value) {
  if (!value) {
    return process.platform;
  }

  if (value === "macos") {
    return "darwin";
  }
  if (value === "windows") {
    return "win32";
  }

  return value;
}

const targetPlatform = normalizeTargetPlatform(readFlag("--target"));

if (targetPlatform !== process.platform) {
  throw new Error(`native-package.mjs target '${targetPlatform}' must run on a matching host platform.`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: options.captureOutput ? "utf8" : undefined,
    env: options.env ?? process.env,
    stdio: options.captureOutput ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    if (options.captureOutput) {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }
    throw new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status ?? 1}.`);
  }

  return result;
}

function assertExists(targetPath, message) {
  if (!existsSync(targetPath)) {
    throw new Error(message);
  }
}

function readSmokeStatus(statusPath) {
  if (!existsSync(statusPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(statusPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse smoke status file at ${statusPath}: ${error.message}`);
  }
}

function normalizeForOutputComparison(value) {
  return value.replaceAll("\\", "/");
}

function resolveExecutableOnPath(name) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(lookupCommand, [name], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }

  const resolved = result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return resolved || null;
}

function resolveEngineExecutablePath() {
  return process.platform === "win32"
    ? path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine.exe")
    : path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine");
}

function resolveBuiltWindowsShellPath() {
  const candidates = [
    path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native.exe"),
    path.join(rootDir, "native", "build", "qt-shell", "Debug", "sse_exed_native.exe"),
    path.join(rootDir, "native", "build", "qt-shell", "Release", "sse_exed_native.exe"),
    path.join(rootDir, "native", "build", "sse_exed_native.exe"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function resolveMacDeployQt() {
  if (process.env.MACDEPLOYQT_PATH && existsSync(process.env.MACDEPLOYQT_PATH)) {
    return process.env.MACDEPLOYQT_PATH;
  }

  const resolved = resolveExecutableOnPath("macdeployqt");
  if (resolved) {
    return resolved;
  }

  throw new Error("macdeployqt was not found. Install Qt or set MACDEPLOYQT_PATH.");
}

function resolveWinDeployQt() {
  if (process.env.WINDEPLOYQT_PATH && existsSync(process.env.WINDEPLOYQT_PATH)) {
    return process.env.WINDEPLOYQT_PATH;
  }

  const resolved = resolveExecutableOnPath("windeployqt");
  if (resolved) {
    return resolved;
  }

  throw new Error("windeployqt was not found. Install Qt or set WINDEPLOYQT_PATH.");
}

function resolveQtPluginsDir() {
  const qtPathsResult = spawnSync("qtpaths", ["--query", "QT_INSTALL_PLUGINS"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (qtPathsResult.status === 0) {
    const resolved = qtPathsResult.stdout.trim();
    if (resolved) {
      return resolved;
    }
  }

  throw new Error("qtpaths could not resolve QT_INSTALL_PLUGINS.");
}

function archiveWindowsDirectory(sourceDir, archivePath) {
  run("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path @('${sourceDir.replaceAll("'", "''")}') -DestinationPath '${archivePath.replaceAll("'", "''")}' -Force`,
  ]);
}

function verifyBundledEngineStart(smokeStatus, expectedEnginePath, statusPath) {
  const startedEnginePath = smokeStatus?.startedEnginePath;
  if (!startedEnginePath) {
    throw new Error(`Packaged smoke test did not record startedEnginePath in ${statusPath}.`);
  }

  if (normalizeForOutputComparison(startedEnginePath) !== normalizeForOutputComparison(expectedEnginePath)) {
    throw new Error(
      `Packaged smoke test launched '${startedEnginePath}' instead of bundled engine '${expectedEnginePath}'.`
    );
  }
}

function verifySmokeStatus(smokeStatus, scenario, packaged, statusPath) {
  if (!smokeStatus) {
    throw new Error(`Packaged native ${packaged.label} smoke did not write ${statusPath}.`);
  }

  if (!smokeStatus.finished) {
    throw new Error(`Packaged native ${packaged.label} smoke did not mark the run as finished in ${statusPath}.`);
  }

  if (smokeStatus.exitCode !== 0) {
    throw new Error(
      `Packaged native ${packaged.label} smoke recorded exit code ${smokeStatus.exitCode} in ${statusPath}.`
    );
  }

  verifyBundledEngineStart(smokeStatus, packaged.packagedEnginePath, statusPath);

  if (smokeStatus.targetSurface !== scenario.expectedTarget) {
    throw new Error(
      `Packaged native ${packaged.label} smoke reached target '${smokeStatus.targetSurface}' instead of '${scenario.expectedTarget}'.`
    );
  }
}

function smokeScenarioConfig(name) {
  switch (name) {
    case "dashboard":
      return {
        expectedTarget: "dashboard",
        env: existsSync(smokeFixturePath) ? { SSE_LEGACY_DB_PATH: smokeFixturePath } : {},
      };
    case "clean-start":
      return {
        expectedTarget: "commissioning",
        env: {
          SSE_DISABLE_AUTO_IMPORT: "1",
        },
      };
    default:
      throw new Error(`Unsupported packaged smoke scenario: ${name}`);
  }
}

function packageMacLocal() {
  if (process.platform !== "darwin") {
    throw new Error("native-package.mjs macOS packaging can only run on macOS.");
  }

  const sourceAppPath = path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native.app");
  const engineExecutablePath = resolveEngineExecutablePath();
  const outputRoot = path.join(rootDir, "release", "native", "macos");
  const packagedAppPath = path.join(outputRoot, "SSE ExEd Studio Control Native.app");
  const packagedShellPath = path.join(packagedAppPath, "Contents", "MacOS", "sse_exed_native");
  const packagedEnginePath = path.join(packagedAppPath, "Contents", "MacOS", path.basename(engineExecutablePath));
  const packagedPlatformsDir = path.join(packagedAppPath, "Contents", "PlugIns", "platforms");
  const packagedArchivePath = path.join(outputRoot, "SSE-ExEd-Studio-Control-Native-macOS.zip");

  assertExists(sourceAppPath, `Native shell bundle not found at ${sourceAppPath}. Run \`npm run native:build\` first.`);
  assertExists(
    engineExecutablePath,
    `Native engine executable not found at ${engineExecutablePath}. Run \`npm run native:build\` first.`
  );
  assertExists(smokeFixturePath, `Dashboard-ready smoke fixture not found at ${smokeFixturePath}.`);

  rmSync(outputRoot, { force: true, recursive: true });
  mkdirSync(outputRoot, { recursive: true });

  cpSync(sourceAppPath, packagedAppPath, { recursive: true });

  const macDeployQt = resolveMacDeployQt();
  run(macDeployQt, [packagedAppPath, `-qmldir=${path.join(rootDir, "native", "qt-shell", "qml")}`]);
  copyFileSync(engineExecutablePath, packagedEnginePath);
  chmodSync(packagedEnginePath, statSync(engineExecutablePath).mode);

  const offscreenPluginPath = path.join(resolveQtPluginsDir(), "platforms", "libqoffscreen.dylib");
  assertExists(offscreenPluginPath, `Qt offscreen platform plugin was not found at ${offscreenPluginPath}.`);
  mkdirSync(packagedPlatformsDir, { recursive: true });
  copyFileSync(offscreenPluginPath, path.join(packagedPlatformsDir, "libqoffscreen.dylib"));

  run("codesign", ["--force", "--deep", "--sign", "-", packagedAppPath]);
  run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", packagedAppPath, packagedArchivePath]);

  console.log(`Packaged native macOS bundle: ${packagedAppPath}`);
  console.log(`Packaged native macOS archive: ${packagedArchivePath}`);

  return {
    label: "macOS",
    packagedShellPath,
    packagedEnginePath,
    smokeRuntimeDir: path.join(outputRoot, "smoke-runtime"),
  };
}

function packageWindowsLocal() {
  if (process.platform !== "win32") {
    throw new Error("native-package.mjs Windows packaging can only run on Windows.");
  }

  const sourceShellPath = resolveBuiltWindowsShellPath();
  const engineExecutablePath = resolveEngineExecutablePath();
  const outputRoot = path.join(rootDir, "release", "native", "windows");
  const packagedDirPath = path.join(outputRoot, "SSE ExEd Studio Control Native");
  const packagedShellPath = path.join(packagedDirPath, "sse_exed_native.exe");
  const packagedEnginePath = path.join(packagedDirPath, path.basename(engineExecutablePath));
  const packagedArchivePath = path.join(outputRoot, "SSE-ExEd-Studio-Control-Native-windows.zip");

  assertExists(
    sourceShellPath ?? "",
    `Native shell executable was not found in native/build. Run \`npm run native:build\` first.`
  );
  assertExists(
    engineExecutablePath,
    `Native engine executable not found at ${engineExecutablePath}. Run \`npm run native:build\` first.`
  );
  assertExists(smokeFixturePath, `Dashboard-ready smoke fixture not found at ${smokeFixturePath}.`);

  rmSync(outputRoot, { force: true, recursive: true });
  mkdirSync(packagedDirPath, { recursive: true });

  copyFileSync(sourceShellPath, packagedShellPath);
  copyFileSync(engineExecutablePath, packagedEnginePath);
  chmodSync(packagedShellPath, statSync(sourceShellPath).mode);
  chmodSync(packagedEnginePath, statSync(engineExecutablePath).mode);

  const winDeployQt = resolveWinDeployQt();
  run(winDeployQt, ["--qmldir", path.join(rootDir, "native", "qt-shell", "qml"), packagedShellPath]);
  archiveWindowsDirectory(packagedDirPath, packagedArchivePath);

  console.log(`Packaged native Windows bundle: ${packagedDirPath}`);
  console.log(`Packaged native Windows archive: ${packagedArchivePath}`);

  return {
    label: "Windows",
    packagedShellPath,
    packagedEnginePath,
    smokeRuntimeDir: path.join(outputRoot, "smoke-runtime"),
  };
}

function smokePackagedBundle(packaged, scenarioName) {
  const scenario = smokeScenarioConfig(scenarioName);
  rmSync(packaged.smokeRuntimeDir, { force: true, recursive: true });
  mkdirSync(packaged.smokeRuntimeDir, { recursive: true });
  const smokeStatusPath = path.join(packaged.smokeRuntimeDir, "smoke-status.json");

  const commandArgs =
    process.platform === "darwin"
      ? ["-platform", "offscreen", "--smoke-test", `--smoke-status-path=${smokeStatusPath}`]
      : ["--smoke-test", `--smoke-status-path=${smokeStatusPath}`];
  const result = run(packaged.packagedShellPath, commandArgs, {
    captureOutput: true,
    env: {
      ...process.env,
      ...scenario.env,
      SSE_APP_DATA_DIR: path.join(packaged.smokeRuntimeDir, "app-data"),
      SSE_LOG_DIR: path.join(packaged.smokeRuntimeDir, "logs"),
    },
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  const smokeStatus = readSmokeStatus(smokeStatusPath);
  verifySmokeStatus(smokeStatus, scenario, packaged, smokeStatusPath);
  console.log(`Packaged native ${packaged.label} smoke passed for scenario '${scenarioName}'.`);
}

let packaged;

if (targetPlatform === "darwin") {
  packaged = packageMacLocal();
} else if (targetPlatform === "win32") {
  packaged = packageWindowsLocal();
} else {
  throw new Error("native-package.mjs currently supports macOS and Windows packaging only.");
}

if (smokeTest) {
  smokePackagedBundle(packaged, readFlag("--scenario") ?? "dashboard");
}
