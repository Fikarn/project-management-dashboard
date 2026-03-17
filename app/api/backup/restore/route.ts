import { existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";
import { readDB, writeDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 10;

function autoBackup(): void {
  if (!existsSync(DB_PATH)) return;
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(BACKUP_DIR, `db-${timestamp}.json`);
  copyFileSync(DB_PATH, dest);

  // Prune old backups
  const { readdirSync, unlinkSync } = require("fs");
  const files: string[] = readdirSync(BACKUP_DIR)
    .filter((f: string) => f.startsWith("db-") && f.endsWith(".json"))
    .sort()
    .reverse();

  for (const file of files.slice(MAX_BACKUPS)) {
    unlinkSync(path.join(BACKUP_DIR, file));
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const data = body as Record<string, unknown>;
  if (!data.projects || !Array.isArray(data.projects)) {
    return Response.json({ error: "Invalid backup: missing projects array" }, { status: 400, headers: corsHeaders });
  }
  if (!data.tasks || !Array.isArray(data.tasks)) {
    return Response.json({ error: "Invalid backup: missing tasks array" }, { status: 400, headers: corsHeaders });
  }

  // Auto-backup current state before restoring
  autoBackup();

  // Write the restored data (migrateDB in readDB will backfill missing fields)
  writeDB(readDB()); // force migration on current
  writeDB(body as Parameters<typeof writeDB>[0]);

  // Re-read with migration to ensure consistency
  const db = readDB();
  writeDB(db);

  eventEmitter.emit("update");

  return Response.json(
    { restored: true, projects: db.projects.length, tasks: db.tasks.length },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
