import { spawnSync } from "node:child_process";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(rootDir, "native", "build");
const nativeBuildScript = path.join(rootDir, "scripts", "native-build.mjs");

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

run("node", [nativeBuildScript, "--configure-only"]);
run("cmake", [
  "--build",
  buildDir,
  "--target",
  "sse_exed_native_qmltests",
  "--parallel",
  String(Math.max(availableParallelism(), 1)),
]);
run("ctest", ["--test-dir", buildDir, "--output-on-failure", "-R", "^sse_exed_native_qmltests$"], {
  QT_QPA_PLATFORM: "offscreen",
  QML_DISABLE_DISK_CACHE: "1",
});
