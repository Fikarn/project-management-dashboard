import { beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";
import type { DB } from "@/lib/types";

const EMPTY_DB = {} as DB;
let testDir: string;

beforeEach(() => {
  // Each test gets a unique temp directory
  testDir = path.join(os.tmpdir(), `epm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
  process.env.DB_DIR = testDir;

  // Reset all globalThis singletons — dbWriteChain must be a resolved Promise, not undefined
  global.dbWriteChain = Promise.resolve(EMPTY_DB);
  global.lastAutoBackup = undefined;
  global.eventEmitter = undefined;
  global.dmxSender = undefined;
  global.dmxLiveState = undefined;
  global.dmxSendTimer = undefined;
  global.dmxPendingSend = undefined;
});

afterEach(() => {
  // Clean up temp directory
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});
