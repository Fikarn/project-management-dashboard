import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assert, EngineHarness, resolvePathFromRoot } from "./native-runtime-harness.mjs";
import { assertCoreParityContracts, assertPlanningWorkflowParity } from "./native-parity-acceptance.mjs";
import { assertSafeBundledSqlite } from "./native-release-safety.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const fixturePath = path.join(rootDir, "native", "rust-engine", "fixtures", "commissioning-sample-db.json");
  assert(existsSync(fixturePath), `Fixture missing: ${fixturePath}`);

  const explicitRoot = resolvePathFromRoot(rootDir, process.env.SSE_NATIVE_ACCEPTANCE_DIR);
  const acceptanceRoot = explicitRoot ?? mkdtempSync(path.join(os.tmpdir(), "sse-native-acceptance-"));
  rmSync(acceptanceRoot, { force: true, recursive: true });
  mkdirSync(acceptanceRoot, { recursive: true });

  const appDataDir = path.join(acceptanceRoot, "runtime");
  const logsDir = path.join(acceptanceRoot, "logs");

  console.log(`Native acceptance root: ${acceptanceRoot}`);
  console.log("Step 1: import legacy workstation data and export a native backup.");

  const firstRun = new EngineHarness({
    rootDir,
    appDataDir,
    logsDir,
    env: {
      SSE_LEGACY_DB_PATH: fixturePath,
    },
  });

  let backupPath;

  try {
    await firstRun.start();
    await assertSafeBundledSqlite(firstRun, "native-acceptance-installed", "Native acceptance engine");
    await assertCoreParityContracts(firstRun, "native-acceptance-installed", "Native acceptance engine");

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

  console.log("Step 2: restart the engine against the same runtime, verify planning workflow parity, and then verify rollback.");

  const secondRun = new EngineHarness({
    rootDir,
    appDataDir,
    logsDir,
    env: {
      SSE_DISABLE_AUTO_IMPORT: "1",
    },
  });

  try {
    await secondRun.start();
    await assertSafeBundledSqlite(secondRun, "native-acceptance-restarted", "Restarted native acceptance engine");

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

    const workflowMutations = await assertPlanningWorkflowParity(
      secondRun,
      "native-acceptance-restarted",
      "Restarted native acceptance engine"
    );

    const mutatedPlanningSnapshot = await secondRun.request("planning-snapshot-mutated", "planning.snapshot");
    assert(
      mutatedPlanningSnapshot.counts?.projectCount === 4,
      `Expected planning workflow mutations to increase project count to 4, got ${mutatedPlanningSnapshot.counts?.projectCount}.`
    );
    assert(
      workflowMutations.temporaryProjectIds.every((projectId) =>
        mutatedPlanningSnapshot.projects?.some((project) => project.id === projectId)
      ),
      "Expected planning workflow mutations to leave temporary parity projects in the mutated snapshot."
    );

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
      workflowMutations.temporaryProjectIds.every(
        (projectId) => !restoredPlanningSnapshot.projects?.some((project) => project.id === projectId)
      ),
      "Expected restore to remove the temporary planning parity projects."
    );
    assert(
      workflowMutations.temporaryTaskIds.every(
        (taskId) => !restoredPlanningSnapshot.tasks?.some((task) => task.id === taskId)
      ),
      "Expected restore to remove the temporary planning parity tasks."
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
