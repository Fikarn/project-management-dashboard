import { readDB, writeDB, mutateDB } from "@/lib/db";
import { autoBackup } from "@/lib/backup";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { ValidationError, jsonResponse, parseJsonObject, withErrorHandling } from "@/lib/api";
import type { DB } from "@/lib/types";

export const POST = withErrorHandling(async (req) => {
  const body = await parseJsonObject(req);

  if (!Array.isArray(body.projects)) {
    throw new ValidationError("Invalid backup: missing projects array", { field: "projects" });
  }
  if (!Array.isArray(body.tasks)) {
    throw new ValidationError("Invalid backup: missing tasks array", { field: "tasks" });
  }

  if (
    body.settings !== undefined &&
    (typeof body.settings !== "object" || body.settings === null || Array.isArray(body.settings))
  ) {
    throw new ValidationError("Invalid backup: settings must be an object", { field: "settings" });
  }

  for (const p of body.projects as Record<string, unknown>[]) {
    if (typeof p.id !== "string" || typeof p.title !== "string") {
      throw new ValidationError("Invalid backup: each project must have id (string) and title (string)", {
        field: "projects",
      });
    }
  }

  for (const t of body.tasks as Record<string, unknown>[]) {
    if (typeof t.id !== "string" || typeof t.projectId !== "string") {
      throw new ValidationError("Invalid backup: each task must have id (string) and projectId (string)", {
        field: "tasks",
      });
    }
  }

  autoBackup();

  const db = await mutateDB(() => {
    writeDB(body as unknown as DB);
    return readDB(); // triggers migrateDB for backfill
  });

  eventEmitter.emit("update");

  return jsonResponse(req, { restored: true, projects: db.projects.length, tasks: db.tasks.length });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
