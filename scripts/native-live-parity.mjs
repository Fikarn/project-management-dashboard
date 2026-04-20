import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveOutputRoot = path.join(rootDir, "artifacts", "parity", "live");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function readFlag(name) {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function readFlags(name) {
  const prefix = `${name}=`;
  return process.argv
    .slice(2)
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length));
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function sanitizeSegment(value) {
  return value
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

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

function readJson(pathname) {
  if (!existsSync(pathname)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(pathname, "utf8"));
  } catch {
    return null;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0 && !options.allowFailure) {
    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Command failed: ${command} ${args.join(" ")}${combinedOutput ? `\n${combinedOutput}` : ""}`);
  }

  return result;
}

async function waitForVerifyStatus(statusPath, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Native live parity app exited early with code ${child.exitCode}.`);
    }

    const status = readJson(statusPath);
    if (status) {
      lastStatus = status;
      if (status.readyForScreenshot) {
        return status;
      }
    }

    await delay(100);
  }

  throw new Error(
    `Timed out waiting for operator verify readiness at ${statusPath}.${lastStatus ? ` Last status: ${JSON.stringify(lastStatus)}` : ""}`
  );
}

function parseInteraction(interaction) {
  if (interaction.startsWith("key:")) {
    const value = interaction.slice("key:".length);
    if (!value) {
      throw new Error(`Invalid key interaction '${interaction}'.`);
    }

    return { kind: "key", value };
  }

  if (interaction.startsWith("click:")) {
    const coords = interaction.slice("click:".length).split(",");
    if (coords.length !== 2) {
      throw new Error(`Invalid click interaction '${interaction}'.`);
    }

    return {
      kind: "click",
      x: Number.parseFloat(coords[0]),
      y: Number.parseFloat(coords[1]),
    };
  }

  throw new Error(`Unsupported interaction '${interaction}'.`);
}

function runInteraction(interaction) {
  const parsed = parseInteraction(interaction);
  if (parsed.kind === "key") {
    run("swift", [path.join(rootDir, "scripts", "live-operator-interact.swift"), "key", parsed.value], {
      stdio: "inherit",
    });
    return;
  }

  run(
    "swift",
    [
      path.join(rootDir, "scripts", "live-operator-interact.swift"),
      "click-normalized",
      String(parsed.x),
      String(parsed.y),
    ],
    { stdio: "inherit" }
  );
}

async function main() {
  const verifyAction = readFlag("--action");
  if (!verifyAction) {
    throw new Error("Missing required flag --action=<operator-verify-action>.");
  }

  if (process.platform !== "darwin") {
    throw new Error("The live parity runner currently supports macOS only.");
  }

  if (hasFlag("--build")) {
    run(npmCommand, ["run", "native:build"], { stdio: "inherit" });
  }

  const shellExecutable = resolveShellExecutable();
  if (!shellExecutable) {
    throw new Error("Native shell executable not found. Run `npm run native:build` first.");
  }

  const settleMs = Number.parseInt(readFlag("--settle-ms") ?? "700", 10);
  const timeoutMs = Number.parseInt(readFlag("--timeout-ms") ?? "30000", 10);
  const interactionPauseMs = Number.parseInt(readFlag("--interaction-pause-ms") ?? "450", 10);
  const interactions = readFlags("--interaction");
  const keepOpen = !hasFlag("--close-after-capture");

  const explicitOutputPath = resolvePathFromRoot(readFlag("--output"));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath =
    explicitOutputPath ??
    path.join(liveOutputRoot, `${timestamp}-${sanitizeSegment(verifyAction || "live-verify")}.png`);

  mkdirSync(path.dirname(outputPath), { recursive: true });

  const runtimeDir = mkdtempSync(path.join(os.tmpdir(), "sse-native-live-parity-"));
  const statusPath = path.join(runtimeDir, "operator-verify-status.json");

  run("killall", ["sse_exed_native"], { allowFailure: true });

  const child = spawn(
    shellExecutable,
    [`--operator-verify-action=${verifyAction}`, `--operator-verify-status-path=${statusPath}`],
    {
      cwd: rootDir,
      detached: true,
      stdio: "ignore",
      env: process.env,
    }
  );
  child.unref();

  let captureCompleted = false;
  try {
    const verifyStatus = await waitForVerifyStatus(statusPath, child, timeoutMs);
    console.log(
      `[native-live-parity] Ready for screenshot: action=${verifyStatus.operatorVerifyAction} surface=${verifyStatus.verifySurface || "unknown"} followup=${verifyStatus.verifyFollowup || "none"}`
    );

    if (settleMs > 0) {
      await delay(settleMs);
    }

    for (const interaction of interactions) {
      console.log(`[native-live-parity] Running interaction ${interaction}`);
      runInteraction(interaction);
      await delay(interactionPauseMs);
    }

    run("swift", [path.join(rootDir, "scripts", "live-operator-interact.swift"), "capture-window", outputPath], {
      stdio: "inherit",
    });
    captureCompleted = true;
    console.log(`[native-live-parity] Captured live operator window -> ${outputPath}`);
  } finally {
    run("osascript", ["-e", 'tell application "Codex" to activate'], {
      allowFailure: true,
      stdio: "ignore",
    });

    if (!keepOpen) {
      run("killall", ["sse_exed_native"], { allowFailure: true });
    }

    rmSync(runtimeDir, { force: true, recursive: true });
  }

  if (!captureCompleted) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[native-live-parity] ${error.message}`);
  process.exitCode = 1;
});
