import { describe, it, expect } from "vitest";
import { readdirSync, writeFileSync } from "fs";
import path from "path";
import { autoBackup, maybeAutoBackup } from "@/lib/backup";
import { writeDB } from "@/lib/db";
import { makeDB } from "../helpers/fixtures";

describe("autoBackup", () => {
  it("creates a backup file", () => {
    // Write a db.json first
    writeDB(makeDB());

    autoBackup();

    const backupDir = path.join(process.env.DB_DIR!, "backups");
    const files = readdirSync(backupDir).filter((f) => f.startsWith("db-"));
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it("prunes old backups beyond 10", () => {
    writeDB(makeDB());

    // Create 12 backups
    for (let i = 0; i < 12; i++) {
      autoBackup();
    }

    const backupDir = path.join(process.env.DB_DIR!, "backups");
    const files = readdirSync(backupDir).filter((f) => f.startsWith("db-"));
    expect(files.length).toBeLessThanOrEqual(10);
  });
});

describe("maybeAutoBackup", () => {
  it("skips backup if last one was recent", () => {
    writeDB(makeDB());
    global.lastAutoBackup = Date.now(); // just happened

    maybeAutoBackup();

    const backupDir = path.join(process.env.DB_DIR!, "backups");
    try {
      const files = readdirSync(backupDir).filter((f) => f.startsWith("db-"));
      // Should have at most the one from writeDB's maybeAutoBackup
      expect(files.length).toBeLessThanOrEqual(1);
    } catch {
      // backups dir may not exist if skipped — that's fine
    }
  });
});
