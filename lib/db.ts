import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, readdirSync } from "fs";
import path from "path";
import type { DB, Priority, LightingSettings } from "./types";
import { maybeAutoBackup } from "./backup";

declare global {
  // eslint-disable-next-line no-var
  var dbWriteChain: Promise<DB> | undefined;
}

function getDbDir(): string {
  return process.env.DB_DIR || path.join(process.cwd(), "data");
}

function getDbPath(): string {
  return path.join(getDbDir(), "db.json");
}

const DEFAULT_LIGHTING_SETTINGS: LightingSettings = {
  apolloBridgeIp: "2.0.0.1",
  dmxUniverse: 1,
  dmxEnabled: false,
  selectedLightId: null,
  selectedSceneId: null,
};

const DEFAULT_DB: DB = {
  projects: [],
  tasks: [],
  activityLog: [],
  settings: {
    viewFilter: "all",
    sortBy: "manual",
    selectedProjectId: null,
    selectedTaskId: null,
    dashboardView: "kanban",
    deckMode: "project",
    hasCompletedSetup: false,
  },
  lights: [],
  lightScenes: [],
  lightingSettings: DEFAULT_LIGHTING_SETTINGS,
};

function ensureDir(): void {
  const dir = path.dirname(getDbPath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Backfill missing fields so old db.json files work with the new schema. */
function migrateDB(raw: Record<string, unknown>): DB {
  const db: DB = {
    projects: (raw.projects as DB["projects"]) ?? [],
    tasks: (raw.tasks as DB["tasks"]) ?? [],
    activityLog: (raw.activityLog as DB["activityLog"]) ?? [],
    settings: {
      ...DEFAULT_DB.settings,
      ...((raw.settings as Partial<DB["settings"]>) ?? {}),
    },
    lights: (raw.lights as DB["lights"]) ?? [],
    lightScenes: (raw.lightScenes as DB["lightScenes"]) ?? [],
    lightingSettings: {
      ...DEFAULT_LIGHTING_SETTINGS,
      ...((raw.lightingSettings as Partial<LightingSettings>) ?? {}),
    },
  };

  db.projects = db.projects.map((p, i) => {
    const proj = p as unknown as Record<string, unknown>;
    return {
      ...p,
      description: (proj.description as string) ?? "",
      priority: (proj.priority as Priority) ?? "p2",
      createdAt: (proj.createdAt as string) ?? p.lastUpdated ?? new Date().toISOString(),
      order: (proj.order as number) ?? i,
    };
  });

  db.tasks = db.tasks.map((t, i) => {
    const task = t as unknown as Record<string, unknown>;
    let totalSeconds = (task.totalSeconds as number) ?? 0;
    let isRunning = (task.isRunning as boolean) ?? false;
    let lastStarted = (task.lastStarted as string | null) ?? null;

    // Timer crash recovery: if task was running, add elapsed time and stop it
    if (isRunning && lastStarted) {
      const parsedTime = new Date(lastStarted).getTime();
      const elapsed = Number.isFinite(parsedTime) ? Math.floor((Date.now() - parsedTime) / 1000) : 0;
      if (elapsed > 0) {
        totalSeconds += elapsed;
        console.warn(`Recovered timer for task "${task.title}": +${elapsed}s`);
      }
      isRunning = false;
      lastStarted = null;
    }

    return {
      ...t,
      description: (task.description as string) ?? "",
      priority: (task.priority as Priority) ?? "p2",
      dueDate: (task.dueDate as string | null) ?? null,
      labels: (task.labels as string[]) ?? [],
      checklist: (task.checklist as DB["tasks"][0]["checklist"]) ?? [],
      completed: (task.completed as boolean) ?? false,
      order: (task.order as number) ?? i,
      createdAt: (task.createdAt as string) ?? new Date().toISOString(),
      totalSeconds,
      isRunning,
      lastStarted,
    };
  });

  return db;
}

export function readDB(): DB {
  ensureDir();
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    try {
      writeFileSync(dbPath, JSON.stringify(DEFAULT_DB, null, 2));
    } catch (err: any) {
      if (err?.code === "ENOSPC") {
        console.error("CRITICAL: Disk full, returning in-memory default DB");
        return structuredClone(DEFAULT_DB);
      }
      throw err;
    }
    return structuredClone(DEFAULT_DB);
  }
  try {
    const raw = JSON.parse(readFileSync(dbPath, "utf-8"));
    return migrateDB(raw);
  } catch (err) {
    console.warn("db.json is corrupted, attempting recovery:", err);
    // Try to restore from most recent backup
    const backupDir = path.join(getDbDir(), "backups");
    if (existsSync(backupDir)) {
      const backups = readdirSync(backupDir)
        .filter((f) => f.startsWith("db-") && f.endsWith(".json"))
        .sort()
        .reverse();
      for (const backup of backups) {
        try {
          const raw = JSON.parse(readFileSync(path.join(backupDir, backup), "utf-8"));
          const db = migrateDB(raw);
          writeDB(db);
          console.warn(`Recovered db.json from backup: ${backup}`);
          return db;
        } catch {
          // This backup is also corrupt, try next
        }
      }
    }
    console.warn("No valid backups found, resetting to default database");
    writeDB(structuredClone(DEFAULT_DB));
    return structuredClone(DEFAULT_DB);
  }
}

export function writeDB(data: DB): void {
  ensureDir();
  const dbPath = getDbPath();
  const tmpPath = dbPath + ".tmp";
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    renameSync(tmpPath, dbPath);
  } catch (err: any) {
    if (err?.code === "ENOSPC") {
      console.error("CRITICAL: Disk full, database write failed");
    }
    // Clean up temp file if it exists
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
  maybeAutoBackup();
}

// Serialize all mutations through a promise chain to prevent concurrent write races.
global.dbWriteChain = global.dbWriteChain ?? Promise.resolve(DEFAULT_DB);

export function mutateDB(fn: (db: DB) => DB): Promise<DB> {
  const op = global.dbWriteChain!.then(() => {
    const db = readDB();
    const updated = fn(db);
    writeDB(updated);
    return updated;
  });
  // Keep chain alive even if this mutation fails
  global.dbWriteChain = op.catch((err) => {
    console.error("mutateDB failed, re-reading from disk:", err);
    return readDB();
  });
  return op;
}
