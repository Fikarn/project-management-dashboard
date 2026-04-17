import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const pathCommand = process.platform === "win32" ? "where" : "which";

function resolveExecutable(name, envNames = []) {
  for (const envName of envNames) {
    const candidate = process.env[envName];
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  const result = spawnSync(pathCommand, [name], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if ((result.status ?? 1) !== 0) {
    return null;
  }

  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find(Boolean);
}

function runNpmScript(name) {
  run(npmCommand, ["run", name]);
}

if (process.platform === "darwin") {
  const binaryCreator = resolveExecutable("binarycreator", ["SSE_QT_IFW_BINARYCREATOR", "QT_IFW_BINARYCREATOR"]);
  const repoGen = resolveExecutable("repogen", ["SSE_QT_IFW_REPOGEN", "QT_IFW_REPOGEN"]);
  if (binaryCreator && repoGen) {
    console.log("Running full macOS native release verification.");
    runNpmScript("native:release:mac:local");
  } else {
    console.log("QtIFW tools not found. Running macOS native release staging verification.");
    runNpmScript("native:build");
    runNpmScript("native:package:mac:smoke");
    runNpmScript("native:package:mac:clean-smoke");
    runNpmScript("native:installer:mac:prepare");
    runNpmScript("native:update-repo:mac:prepare");
    runNpmScript("native:artifacts:mac:staged-verify");
  }
  process.exit(0);
}

if (process.platform === "win32") {
  const binaryCreator = resolveExecutable("binarycreator", ["SSE_QT_IFW_BINARYCREATOR", "QT_IFW_BINARYCREATOR"]);
  const repoGen = resolveExecutable("repogen", ["SSE_QT_IFW_REPOGEN", "QT_IFW_REPOGEN"]);
  if (binaryCreator && repoGen) {
    console.log("Running full Windows native release verification.");
    runNpmScript("native:release:win:local");
  } else {
    console.log("QtIFW tools not found. Running Windows native release staging verification.");
    runNpmScript("native:build");
    runNpmScript("native:package:win:smoke");
    runNpmScript("native:package:win:clean-smoke");
    runNpmScript("native:installer:win:prepare");
    runNpmScript("native:update-repo:win:prepare");
    runNpmScript("native:artifacts:win:staged-verify");
  }
  process.exit(0);
}

console.log(
  `Skipping platform-native packaging verification on ${process.platform}. Run release verification on macOS or Windows for installer and update-repository checks.`
);
