import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const smokeTest = args.has("--smoke-test");

const sourceAppPath = path.join(rootDir, "native", "build", "qt-shell", "sse_exed_native.app");
const engineExecutablePath =
  process.platform === "win32"
    ? path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine.exe")
    : path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine");
const outputRoot = path.join(rootDir, "release", "native", "macos");
const packagedAppPath = path.join(outputRoot, "SSE ExEd Studio Control Native.app");
const packagedShellPath = path.join(packagedAppPath, "Contents", "MacOS", "sse_exed_native");
const packagedEnginePath = path.join(packagedAppPath, "Contents", "MacOS", path.basename(engineExecutablePath));
const packagedPlatformsDir = path.join(packagedAppPath, "Contents", "PlugIns", "platforms");
const packagedArchivePath = path.join(outputRoot, "SSE-ExEd-Studio-Control-Native-macOS.zip");
const smokeFixturePath = path.join(rootDir, "native", "rust-engine", "fixtures", "dashboard-ready-db.json");
const smokeRuntimeDir = path.join(outputRoot, "smoke-runtime");

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

function resolveMacDeployQt() {
  if (process.env.MACDEPLOYQT_PATH && existsSync(process.env.MACDEPLOYQT_PATH)) {
    return process.env.MACDEPLOYQT_PATH;
  }

  const whichResult = spawnSync("which", ["macdeployqt"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (whichResult.status === 0) {
    const resolved = whichResult.stdout.trim();
    if (resolved) {
      return resolved;
    }
  }

  throw new Error("macdeployqt was not found. Install Qt or set MACDEPLOYQT_PATH.");
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

function packageMacLocal() {
  if (process.platform !== "darwin") {
    throw new Error("native-package.mjs currently supports macOS packaging only.");
  }

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
}

function smokePackagedBundle() {
  rmSync(smokeRuntimeDir, { force: true, recursive: true });
  mkdirSync(smokeRuntimeDir, { recursive: true });

  const result = run(packagedShellPath, ["-platform", "offscreen", "--smoke-test"], {
    captureOutput: true,
    env: {
      ...process.env,
      SSE_APP_DATA_DIR: path.join(smokeRuntimeDir, "app-data"),
      SSE_LOG_DIR: path.join(smokeRuntimeDir, "logs"),
      SSE_LEGACY_DB_PATH: smokeFixturePath,
    },
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!combinedOutput.includes(`Starting engine: ${packagedEnginePath}`)) {
    throw new Error(`Packaged smoke test did not launch the bundled engine at ${packagedEnginePath}.`);
  }

  console.log("Packaged native macOS smoke passed.");
}

packageMacLocal();

if (smokeTest) {
  smokePackagedBundle();
}
