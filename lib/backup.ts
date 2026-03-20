import { existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from "fs";
import path from "path";

const MAX_BACKUPS = 10;
const BACKUP_COOLDOWN_ON_FAILURE = 5 * 60 * 1000; // 5 minutes

declare global {
  // eslint-disable-next-line no-var
  var lastAutoBackup: number | undefined;
}

function getDbDir(): string {
  return process.env.DB_DIR || path.join(process.cwd(), "data");
}

export function autoBackup(): void {
  const dbDir = getDbDir();
  const dbPath = path.join(dbDir, "db.json");
  const backupDir = path.join(dbDir, "backups");

  if (!existsSync(dbPath)) return;
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(backupDir, `db-${timestamp}.json`);
  copyFileSync(dbPath, dest);

  // Prune old backups
  const files: string[] = readdirSync(backupDir)
    .filter((f: string) => f.startsWith("db-") && f.endsWith(".json"))
    .sort()
    .reverse();

  for (const file of files.slice(MAX_BACKUPS)) {
    try {
      unlinkSync(path.join(backupDir, file));
    } catch (err) {
      console.error(`Failed to prune backup ${file}:`, err);
    }
  }

  global.lastAutoBackup = Date.now();
}

export function maybeAutoBackup(): void {
  const now = Date.now();
  const last = global.lastAutoBackup ?? 0;
  // Auto-backup at most once every 30 minutes
  if (now - last > 30 * 60 * 1000) {
    try {
      autoBackup();
    } catch (err) {
      console.error("Auto-backup failed:", err);
      // Set cooldown so we don't retry-flood on persistent errors
      global.lastAutoBackup = now - 30 * 60 * 1000 + BACKUP_COOLDOWN_ON_FAILURE;
    }
  }
}
