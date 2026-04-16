import { spawnSync } from "node:child_process";
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

function hasExecutable(name) {
  const result = spawnSync(pathCommand, [name], {
    cwd: rootDir,
    stdio: "ignore",
  });

  return (result.status ?? 1) === 0;
}

function runNpmScript(name) {
  run(npmCommand, ["run", name]);
}

if (process.platform === "darwin") {
  if (hasExecutable("binarycreator") && hasExecutable("repogen")) {
    console.log("Running full macOS native release verification.");
    runNpmScript("native:release:mac:local");
  } else {
    console.log("QtIFW tools not found. Running macOS native release staging verification.");
    runNpmScript("native:build");
    runNpmScript("native:package:mac:smoke");
    runNpmScript("native:package:mac:clean-smoke");
    runNpmScript("native:installer:mac:prepare");
    runNpmScript("native:update-repo:mac:prepare");
  }
  process.exit(0);
}

if (process.platform === "win32") {
  if (hasExecutable("binarycreator") && hasExecutable("repogen")) {
    console.log("Running full Windows native release verification.");
    runNpmScript("native:release:win:local");
  } else {
    console.log("QtIFW tools not found. Running Windows native release staging verification.");
    runNpmScript("native:build");
    runNpmScript("native:package:win:smoke");
    runNpmScript("native:package:win:clean-smoke");
    runNpmScript("native:installer:win:prepare");
    runNpmScript("native:update-repo:win:prepare");
  }
  process.exit(0);
}

console.log(
  `Skipping platform-native packaging verification on ${process.platform}. Run release verification on macOS or Windows for installer and update-repository checks.`
);
