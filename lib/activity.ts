import type { DB, ActivityEntry } from "./types";
import { generateId } from "./id";

const MAX_ENTRIES = 500;

/** Strip HTML tags and limit string length for defense-in-depth sanitization. */
function sanitize(str: string, maxLen = 200): string {
  return str.replace(/<[^>]*>/g, "").slice(0, maxLen);
}

export function logActivity(
  db: DB,
  entityType: "project" | "task" | "light" | "scene" | "audio",
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
    detail: sanitize(detail),
  };
  return {
    ...db,
    activityLog: [entry, ...db.activityLog].slice(0, MAX_ENTRIES),
  };
}
