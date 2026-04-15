import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeDir = path.join(rootDir, "native");
const buildDir = path.join(nativeDir, "build");
const args = new Set(process.argv.slice(2));

const configureOnly = args.has("--configure-only");
const buildOnly = args.has("--build-only");

if (configureOnly && buildOnly) {
  console.error("Choose either --configure-only or --build-only, not both.");
  process.exit(1);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveQtPrefixPath() {
  if (process.env.CMAKE_PREFIX_PATH) {
    return process.env.CMAKE_PREFIX_PATH;
  }

  const directCandidates = [process.env.QT_ROOT_DIR, process.env.QTDIR, process.env.QT_DIR];
  for (const candidate of directCandidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  if (process.env.Qt6_DIR) {
    const prefixCandidate = path.resolve(process.env.Qt6_DIR, "..", "..", "..");
    if (existsSync(prefixCandidate)) {
      return prefixCandidate;
    }
  }

  if (process.platform !== "darwin") {
    return null;
  }

  const candidates = ["/opt/homebrew/opt/qt", "/usr/local/opt/qt"];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function configure() {
  const prefixPath = resolveQtPrefixPath();
  const commandArgs = ["-S", nativeDir, "-B", buildDir];

  if (prefixPath) {
    commandArgs.push(`-DCMAKE_PREFIX_PATH=${prefixPath}`);
    console.log(`Configuring native shell with CMAKE_PREFIX_PATH=${prefixPath}`);
  } else if (process.platform === "darwin") {
    console.log("Configuring native shell without an explicit CMAKE_PREFIX_PATH override.");
  }

  run("cmake", commandArgs);
}

function build() {
  const parallelism = Math.max(availableParallelism(), 1);
  run("cmake", ["--build", buildDir, "--parallel", String(parallelism)]);
}

const shouldConfigure = !buildOnly;
const shouldBuild = !configureOnly;

if (!shouldConfigure && !existsSync(path.join(buildDir, "CMakeCache.txt"))) {
  console.log("No native CMake cache found. Running configure first.");
  configure();
}

if (shouldConfigure) {
  configure();
}

if (shouldBuild) {
  build();
}
