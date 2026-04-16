import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFlag(name) {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function parseTarget(value) {
  if (value === "macos") {
    return "macos";
  }

  if (value === "windows") {
    return "windows";
  }

  throw new Error(`Unsupported update repository target '${value}'. Use --target=macos or --target=windows.`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function archiveMacPath(sourcePath, archivePath) {
  run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", sourcePath, archivePath]);
}

function archiveWindowsPath(sourcePath, archivePath) {
  run("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path @('${sourcePath.replaceAll("'", "''")}') -DestinationPath '${archivePath.replaceAll(
      "'",
      "''"
    )}' -Force`,
  ]);
}

function resolvePackagedPayload(target) {
  if (target === "macos") {
    return {
      packagedPath: path.join(rootDir, "release", "native", "macos", "SSE ExEd Studio Control Native.app"),
      repositoryPath: path.join(rootDir, "release", "native-updates", "macos", "repository"),
      archivePath: path.join(
        rootDir,
        "release",
        "native-updates",
        "macos",
        "SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip"
      ),
    };
  }

  return {
    packagedPath: path.join(rootDir, "release", "native", "windows", "SSE ExEd Studio Control Native"),
    repositoryPath: path.join(rootDir, "release", "native-updates", "windows", "repository"),
    archivePath: path.join(
      rootDir,
      "release",
      "native-updates",
      "windows",
      "SSE-ExEd-Studio-Control-Native-windows-UpdateRepository.zip"
    ),
  };
}

function ensurePackagedPayload(target, packagedPath) {
  if (existsSync(packagedPath)) {
    return;
  }

  if (target === "macos" && process.platform === "darwin") {
    run(process.execPath, [path.join(rootDir, "scripts", "native-package.mjs"), "--target=macos"]);
    return;
  }

  if (target === "windows" && process.platform === "win32") {
    run(process.execPath, [path.join(rootDir, "scripts", "native-package.mjs"), "--target=windows"]);
    return;
  }

  throw new Error(
    `Packaged native payload not found at ${packagedPath}. Build the platform-native package on a matching host first.`
  );
}

function renderPackageXml({ version, releaseDate }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Package>
  <DisplayName>SSE ExEd Studio Control Native</DisplayName>
  <Description>Native workstation runtime distributed through the Qt Installer Framework maintenance-tool repository.</Description>
  <Version>${version}</Version>
  <ReleaseDate>${releaseDate}</ReleaseDate>
  <Name>com.sse.exedstudiocontrol.native</Name>
  <Default>true</Default>
  <ForcedInstallation>true</ForcedInstallation>
  <Essential>true</Essential>
  <Licenses>
    <License name="MIT" file="LICENSE.txt"/>
  </Licenses>
</Package>
`;
}

function resolveRepogen() {
  const envCandidates = [process.env.SSE_QT_IFW_REPOGEN, process.env.QT_IFW_REPOGEN].filter(Boolean);

  for (const candidate of envCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const pathCommand = process.platform === "win32" ? "where" : "which";
  const pathResult = spawnSync(pathCommand, ["repogen"], { cwd: rootDir, encoding: "utf8" });
  if ((pathResult.status ?? 1) === 0) {
    const discovered = pathResult.stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .find(Boolean);
    if (discovered) {
      return discovered;
    }
  }

  return null;
}

const target = parseTarget(readFlag("--target"));
const prepareOnly = hasFlag("--prepare-only");
const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
const releaseDate = new Date().toISOString().slice(0, 10);
const { packagedPath, repositoryPath, archivePath } = resolvePackagedPayload(target);

ensurePackagedPayload(target, packagedPath);

const updateRoot = path.join(rootDir, "release", "native-updates", target);
const buildRoot = path.join(updateRoot, "ifw");
const packageRoot = path.join(buildRoot, "packages", "com.sse.exedstudiocontrol.native");
const metaDir = path.join(packageRoot, "meta");
const dataDir = path.join(packageRoot, "data");

rmSync(buildRoot, { force: true, recursive: true });
mkdirSync(metaDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

writeFileSync(
  path.join(metaDir, "package.xml"),
  renderPackageXml({ version: packageJson.version, releaseDate }),
  "utf8"
);
copyFileSync(path.join(rootDir, "LICENSE"), path.join(metaDir, "LICENSE.txt"));

const stagedPayloadPath = path.join(dataDir, path.basename(packagedPath));
cpSync(packagedPath, stagedPayloadPath, { recursive: true });

console.log(`Prepared native update repository staging for ${target}: ${buildRoot}`);
console.log(`Staged payload: ${stagedPayloadPath}`);

if (prepareOnly) {
  console.log("Skipping repogen build because --prepare-only was requested.");
  process.exit(0);
}

const repogen = resolveRepogen();
if (!repogen) {
  throw new Error("Qt Installer Framework repogen was not found. Set SSE_QT_IFW_REPOGEN or install QtIFW.");
}

rmSync(repositoryPath, { force: true, recursive: true });
mkdirSync(path.dirname(repositoryPath), { recursive: true });
rmSync(archivePath, { force: true, recursive: true });

run(repogen, ["-p", path.join(buildRoot, "packages"), repositoryPath]);

if (target === "macos") {
  archiveMacPath(repositoryPath, archivePath);
} else {
  archiveWindowsPath(repositoryPath, archivePath);
}

console.log(`Built native update repository: ${repositoryPath}`);
console.log(`Archived native update repository: ${archivePath}`);
