import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { DB } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var dbWriteChain: Promise<DB> | undefined;
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const DEFAULT_DB: DB = { projects: [], tasks: [] };

function ensureDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readDB(): DB {
  ensureDir();
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return structuredClone(DEFAULT_DB);
  }
  return JSON.parse(readFileSync(DB_PATH, "utf-8")) as DB;
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
