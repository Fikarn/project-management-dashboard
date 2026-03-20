import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { readDB, writeDB, mutateDB } from "@/lib/db";
import { makeDB, makeProject, makeTask } from "../helpers/fixtures";

describe("readDB", () => {
  it("creates default db.json if it does not exist", () => {
    const db = readDB();
    expect(db.projects).toEqual([]);
    expect(db.tasks).toEqual([]);
    expect(db.settings.viewFilter).toBe("all");

    // File should exist on disk
    const onDisk = JSON.parse(readFileSync(path.join(process.env.DB_DIR!, "db.json"), "utf-8"));
    expect(onDisk.projects).toEqual([]);
  });

  it("reads existing db.json", () => {
    const project = makeProject({ title: "Existing" });
    const db = makeDB({ projects: [project] });
    writeFileSync(path.join(process.env.DB_DIR!, "db.json"), JSON.stringify(db));

    const result = readDB();
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].title).toBe("Existing");
  });

  it("recovers from corrupted db.json using backups", () => {
    // Write a valid backup
    const backupDir = path.join(process.env.DB_DIR!, "backups");
    mkdirSync(backupDir, { recursive: true });
    const validDB = makeDB({ projects: [makeProject({ title: "Recovered" })] });
    writeFileSync(path.join(backupDir, "db-2024-01-01.json"), JSON.stringify(validDB));

    // Write corrupted main file
    writeFileSync(path.join(process.env.DB_DIR!, "db.json"), "INVALID JSON{{{");

    const db = readDB();
    expect(db.projects[0].title).toBe("Recovered");
  });

  it("falls back to default DB if no valid backups exist", () => {
    writeFileSync(path.join(process.env.DB_DIR!, "db.json"), "CORRUPTED");

    const db = readDB();
    expect(db.projects).toEqual([]);
  });
});

describe("writeDB", () => {
  it("writes data atomically", () => {
    const db = makeDB({ projects: [makeProject({ title: "Written" })] });
    writeDB(db);

    const onDisk = JSON.parse(readFileSync(path.join(process.env.DB_DIR!, "db.json"), "utf-8"));
    expect(onDisk.projects[0].title).toBe("Written");
  });
});

describe("mutateDB", () => {
  it("serializes concurrent mutations", async () => {
    readDB(); // initialize

    const results = await Promise.all([
      mutateDB((db) => ({
        ...db,
        projects: [...db.projects, makeProject({ title: "First" })],
      })),
      mutateDB((db) => ({
        ...db,
        projects: [...db.projects, makeProject({ title: "Second" })],
      })),
    ]);

    // Both should have been applied
    const final = readDB();
    expect(final.projects).toHaveLength(2);
    expect(final.projects.map((p) => p.title)).toContain("First");
    expect(final.projects.map((p) => p.title)).toContain("Second");
  });

  it("keeps chain alive after errors", async () => {
    readDB(); // initialize

    // This mutation throws
    const failing = mutateDB(() => {
      throw new Error("intentional error");
    });
    await expect(failing).rejects.toThrow("intentional error");

    // Next mutation should still work
    const result = await mutateDB((db) => ({
      ...db,
      projects: [...db.projects, makeProject({ title: "After Error" })],
    }));
    expect(result.projects[0].title).toBe("After Error");
  });
});

describe("migrateDB (timer crash recovery)", () => {
  it("recovers running timers on startup", () => {
    const fiveMinutesAgo = new Date(Date.now() - 300_000).toISOString();
    const task = makeTask({
      isRunning: true,
      lastStarted: fiveMinutesAgo,
      totalSeconds: 100,
    });
    const db = makeDB({ tasks: [task] });
    writeFileSync(path.join(process.env.DB_DIR!, "db.json"), JSON.stringify(db));

    const result = readDB();
    expect(result.tasks[0].isRunning).toBe(false);
    expect(result.tasks[0].lastStarted).toBeNull();
    // Should have added ~300s to the existing 100s
    expect(result.tasks[0].totalSeconds).toBeGreaterThanOrEqual(395);
    expect(result.tasks[0].totalSeconds).toBeLessThanOrEqual(405);
  });

  it("handles malformed lastStarted dates (NaN guard)", () => {
    const task = makeTask({
      isRunning: true,
      lastStarted: "not-a-date",
      totalSeconds: 50,
    });
    const db = makeDB({ tasks: [task] });
    writeFileSync(path.join(process.env.DB_DIR!, "db.json"), JSON.stringify(db));

    const result = readDB();
    expect(result.tasks[0].isRunning).toBe(false);
    // totalSeconds should not be NaN — NaN guard produces 0 elapsed
    expect(result.tasks[0].totalSeconds).toBe(50);
  });

  it("backfills missing fields on projects", () => {
    const raw = {
      projects: [{ id: "p1", title: "Old", status: "todo", lastUpdated: "2024-01-01" }],
      tasks: [],
      activityLog: [],
      settings: {},
    };
    writeFileSync(path.join(process.env.DB_DIR!, "db.json"), JSON.stringify(raw));

    const db = readDB();
    expect(db.projects[0].description).toBe("");
    expect(db.projects[0].priority).toBe("p2");
    expect(db.projects[0].order).toBe(0);
    expect(db.projects[0].createdAt).toBe("2024-01-01"); // falls back to lastUpdated
  });
});
