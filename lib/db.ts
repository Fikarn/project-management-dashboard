import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { DB, Priority } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var dbWriteChain: Promise<DB> | undefined;
}

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

const DEFAULT_DB: DB = {
  projects: [],
  tasks: [],
  activityLog: [],
  settings: { viewFilter: "all", sortBy: "manual", selectedProjectId: null },
};

function ensureDir(): void {
  const dir = path.dirname(DB_PATH);
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
    };
  });

  return db;
}

export function readDB(): DB {
  ensureDir();
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return structuredClone(DEFAULT_DB);
  }
  const raw = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  return migrateDB(raw);
}

export function writeDB(data: DB): void {
  ensureDir();
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Serialize all mutations through a promise chain to prevent concurrent write races.
global.dbWriteChain = global.dbWriteChain ?? Promise.resolve(DEFAULT_DB);

export function mutateDB(fn: (db: DB) => DB): Promise<DB> {
  global.dbWriteChain = global.dbWriteChain!.then(() => {
    const db = readDB();
    const updated = fn(db);
    writeDB(updated);
    return updated;
  });
  return global.dbWriteChain;
}
