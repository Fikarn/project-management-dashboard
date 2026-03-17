import type { DB, ActivityEntry } from "./types";
import { generateId } from "./id";

const MAX_ENTRIES = 500;

export function logActivity(
  db: DB,
  entityType: "project" | "task",
  entityId: string,
  action: string,
  detail: string
): DB {
  const entry: ActivityEntry = {
    id: generateId("act"),
    timestamp: new Date().toISOString(),
    entityType,
    entityId,
    action,
    detail,
  };
  return {
    ...db,
    activityLog: [entry, ...db.activityLog].slice(0, MAX_ENTRIES),
  };
}
