import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolvePathFromRoot(value) {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value) ? value : path.join(rootDir, value);
}

function resolveEngineExecutable() {
  return process.platform === "win32"
    ? path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine.exe")
    : path.join(rootDir, "native", "rust-engine", "target", "debug", "studio-control-engine");
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class EngineHarness {
  constructor({ appDataDir, logsDir, env = {} }) {
    this.appDataDir = appDataDir;
    this.logsDir = logsDir;
    this.env = env;
    this.child = null;
    this.responseWaiters = new Map();
    this.stdoutBuffer = "";
    this.stderrBuffer = "";
    this.readyResolve = null;
    this.readyReject = null;
    this.exitResolve = null;
    this.exitReject = null;
    this.readySettled = false;
    this.closed = false;
    this.lastReadyPayload = null;
  }

  async start() {
    const engineExecutable = resolveEngineExecutable();
    if (!existsSync(engineExecutable)) {
      throw new Error(`Native engine executable not found at ${engineExecutable}. Run \`npm run native:build\` first.`);
    }

    mkdirSync(this.appDataDir, { recursive: true });
    mkdirSync(this.logsDir, { recursive: true });

    console.log(`Starting native engine: ${engineExecutable}`);

    this.child = spawn(engineExecutable, [], {
      cwd: rootDir,
      env: {
        ...process.env,
        SSE_PROTOCOL_VERSION: "1",
        SSE_APP_DATA_DIR: this.appDataDir,
        SSE_LOG_DIR: this.logsDir,
        ...this.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.handleStdout(chunk));
    this.child.stderr.on("data", (chunk) => this.handleStderr(chunk));
    this.child.on("error", (error) => this.failAll(error));
    this.child.on("exit", (code, signal) => this.handleExit(code, signal));

    const readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    await Promise.race([
      readyPromise,
      wait(8000).then(() => {
        throw new Error("Timed out waiting for engine.ready.");
      }),
    ]);
  }

  handleStdout(chunk) {
    this.stdoutBuffer += chunk;
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) {
        continue;
      }

      console.log(`[engine stdout] ${line}`);

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        this.failAll(new Error(`Failed to parse engine stdout JSON: ${error.message}`));
        continue;
      }

      if (message.type === "event") {
        this.handleEvent(message);
        continue;
      }

      if (message.type === "response") {
        const waiter = this.responseWaiters.get(String(message.id));
        if (waiter) {
          this.responseWaiters.delete(String(message.id));
          waiter.resolve(message);
        }
      }
    }
  }

  handleStderr(chunk) {
    this.stderrBuffer += chunk;
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      console.log(`[engine stderr] ${line}`);
    }
  }

  handleEvent(message) {
    if (message.event === "engine.ready") {
      this.lastReadyPayload = message.payload ?? null;
      if (!this.readySettled && this.readyResolve) {
        this.readySettled = true;
        this.readyResolve(message.payload ?? {});
      }
      return;
    }

    if (message.event === "engine.startupFailed") {
      const details = message.payload?.message ?? "Engine startup failed.";
      const error = new Error(details);
      error.code = message.payload?.code;
      if (!this.readySettled && this.readyReject) {
        this.readySettled = true;
        this.readyReject(error);
      }
      this.failAll(error);
    }
  }

  handleExit(code, signal) {
    const exitCode = code ?? 1;
    const exitDescription = signal ? `signal ${signal}` : `code ${exitCode}`;
    if (!this.closed && exitCode !== 0) {
      this.failAll(new Error(`Engine exited unexpectedly with ${exitDescription}.`));
      return;
    }

    if (this.exitResolve) {
      this.exitResolve({ code: exitCode, signal });
      this.exitResolve = null;
      this.exitReject = null;
    }
  }

  failAll(error) {
    if (!this.readySettled && this.readyReject) {
      this.readySettled = true;
      this.readyReject(error);
    }

    for (const waiter of this.responseWaiters.values()) {
      waiter.reject(error);
    }
    this.responseWaiters.clear();

    if (this.exitReject) {
      this.exitReject(error);
      this.exitResolve = null;
      this.exitReject = null;
    }
  }

  async request(id, method, params = {}) {
    if (!this.child || !this.child.stdin || this.child.exitCode !== null) {
      throw new Error(`Cannot send request ${method}; engine is not running.`);
    }

    const envelope = JSON.stringify({ id, method, params });
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseWaiters.delete(String(id));
        reject(new Error(`Timed out waiting for response to ${method}.`));
      }, 8000);

      this.responseWaiters.set(String(id), {
        resolve: (message) => {
          clearTimeout(timeout);
          resolve(message);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });

    this.child.stdin.write(`${envelope}\n`);
    const response = await responsePromise;
    if (!response.ok) {
      const code = response.error?.code ?? "UNKNOWN_ERROR";
      const message = response.error?.message ?? `Request ${method} failed.`;
      throw new Error(`${method} failed with ${code}: ${message}`);
    }

    return response.result ?? {};
  }

  async close() {
    if (!this.child || this.closed) {
      return;
    }

    this.closed = true;
    const exitPromise = new Promise((resolve, reject) => {
      this.exitResolve = resolve;
      this.exitReject = reject;
    });

    this.child.stdin.end();

    const result = await Promise.race([
      exitPromise,
      wait(3000).then(async () => {
        this.child.kill("SIGKILL");
        await wait(200);
        throw new Error("Engine did not exit cleanly after stdin closed.");
      }),
    ]);

    assert(result.code === 0, `Engine closed with exit code ${result.code}.`);
  }
}

async function main() {
  const fixturePath = path.join(rootDir, "native", "rust-engine", "fixtures", "commissioning-sample-db.json");
  assert(existsSync(fixturePath), `Fixture missing: ${fixturePath}`);

  const explicitRoot = resolvePathFromRoot(process.env.SSE_NATIVE_ACCEPTANCE_DIR);
  const acceptanceRoot = explicitRoot ?? mkdtempSync(path.join(os.tmpdir(), "sse-native-acceptance-"));
  rmSync(acceptanceRoot, { force: true, recursive: true });
  mkdirSync(acceptanceRoot, { recursive: true });

  const appDataDir = path.join(acceptanceRoot, "runtime");
  const logsDir = path.join(acceptanceRoot, "logs");

  console.log(`Native acceptance root: ${acceptanceRoot}`);
  console.log("Step 1: import legacy workstation data and export a native backup.");

  const firstRun = new EngineHarness({
    appDataDir,
    logsDir,
    env: {
      SSE_LEGACY_DB_PATH: fixturePath,
    },
  });

  let backupPath;

  try {
    await firstRun.start();

    const initialAppSnapshot = await firstRun.request("app-snapshot-initial", "app.snapshot");
    const initialPlanningSnapshot = await firstRun.request("planning-snapshot-initial", "planning.snapshot");

    assert(
      initialAppSnapshot.startup?.targetSurface === "commissioning",
      `Expected imported workstation to start in commissioning, got '${initialAppSnapshot.startup?.targetSurface}'.`
    );
    assert(initialPlanningSnapshot.counts?.projectCount === 2, "Expected imported project count to be 2.");
    assert(initialPlanningSnapshot.counts?.taskCount === 3, "Expected imported task count to be 3.");

    const commissioningUpdate = await firstRun.request("commissioning-ready", "commissioning.update", {
      stage: "ready",
    });
    assert(
      commissioningUpdate.startup?.targetSurface === "dashboard",
      `Expected commissioning update to unlock dashboard, got '${commissioningUpdate.startup?.targetSurface}'.`
    );

    const exportSummary = await firstRun.request("support-backup-export", "support.backup.export");
    backupPath = exportSummary.path;
    assert(backupPath && existsSync(backupPath), "Expected native backup export to create an archive.");
  } finally {
    await firstRun.close().catch((error) => {
      throw error;
    });
  }

  console.log("Step 2: restart the engine against the same runtime and verify persisted startup state.");

  const secondRun = new EngineHarness({
    appDataDir,
    logsDir,
    env: {
      SSE_DISABLE_AUTO_IMPORT: "1",
    },
  });

  try {
    await secondRun.start();

    const restartedAppSnapshot = await secondRun.request("app-snapshot-restart", "app.snapshot");
    const restartedPlanningSnapshot = await secondRun.request("planning-snapshot-restart", "planning.snapshot");

    assert(
      restartedAppSnapshot.startup?.targetSurface === "dashboard",
      `Expected restarted workstation to route to dashboard, got '${restartedAppSnapshot.startup?.targetSurface}'.`
    );
    assert(
      restartedAppSnapshot.commissioning?.stage === "ready",
      `Expected persisted commissioning stage to remain ready, got '${restartedAppSnapshot.commissioning?.stage}'.`
    );
    assert(restartedPlanningSnapshot.counts?.projectCount === 2, "Expected restarted project count to remain 2.");
    assert(restartedPlanningSnapshot.counts?.taskCount === 3, "Expected restarted task count to remain 3.");

    await secondRun.request("planning-project-create", "planning.project.create", {
      title: "Rollback Sentinel",
      description: "Temporary project used to verify restore rollback.",
      status: "todo",
      priority: "p2",
    });

    const mutatedPlanningSnapshot = await secondRun.request("planning-snapshot-mutated", "planning.snapshot");
    assert(mutatedPlanningSnapshot.counts?.projectCount === 3, "Expected mutation to increase project count to 3.");

    const restoreSummary = await secondRun.request("support-backup-restore", "support.backup.restore", {
      path: backupPath,
    });
    assert(
      restoreSummary.sourceFormat === "native-support-backup",
      `Expected restore source format to be native-support-backup, got '${restoreSummary.sourceFormat}'.`
    );
    assert(
      restoreSummary.rollbackBackupPath && existsSync(restoreSummary.rollbackBackupPath),
      "Expected restore to generate a rollback archive."
    );

    const restoredPlanningSnapshot = await secondRun.request("planning-snapshot-restored", "planning.snapshot");
    const restoredAppSnapshot = await secondRun.request("app-snapshot-restored", "app.snapshot");
    assert(restoredPlanningSnapshot.counts?.projectCount === 2, "Expected restore to roll project count back to 2.");
    assert(
      !restoredPlanningSnapshot.projects?.some((project) => project.title === "Rollback Sentinel"),
      "Expected rollback sentinel project to be removed by restore."
    );
    assert(
      restoredAppSnapshot.startup?.targetSurface === "dashboard",
      `Expected restored workstation to remain on dashboard, got '${restoredAppSnapshot.startup?.targetSurface}'.`
    );
  } finally {
    await secondRun.close().catch((error) => {
      throw error;
    });
  }

  console.log("Native acceptance passed: import, restart, and rollback are deterministic.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
