import { readDB, writeDB, mutateDB } from "@/lib/db";
import { autoBackup } from "@/lib/backup";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import type { DB } from "@/lib/types";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();

  const data = body as Record<string, unknown>;
  if (!data.projects || !Array.isArray(data.projects)) {
    return Response.json({ error: "Invalid backup: missing projects array" }, { status: 400, headers: corsHeaders });
  }
  if (!data.tasks || !Array.isArray(data.tasks)) {
    return Response.json({ error: "Invalid backup: missing tasks array" }, { status: 400, headers: corsHeaders });
  }

  // Validate settings is an object if present
  if (
    data.settings !== undefined &&
    (typeof data.settings !== "object" || data.settings === null || Array.isArray(data.settings))
  ) {
    return Response.json(
      { error: "Invalid backup: settings must be an object" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate each project has id and title
  for (const p of data.projects as Record<string, unknown>[]) {
    if (typeof p.id !== "string" || typeof p.title !== "string") {
      return Response.json(
        { error: "Invalid backup: each project must have id (string) and title (string)" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  // Validate each task has id and projectId
  for (const t of data.tasks as Record<string, unknown>[]) {
    if (typeof t.id !== "string" || typeof t.projectId !== "string") {
      return Response.json(
        { error: "Invalid backup: each task must have id (string) and projectId (string)" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  // Auto-backup current state before restoring
  autoBackup();

  // Write the restored data through mutateDB to serialize with other writes
  const db = await mutateDB(() => {
    writeDB(body as DB);
    return readDB(); // triggers migrateDB for backfill
  });

  eventEmitter.emit("update");

  return Response.json(
    { restored: true, projects: db.projects.length, tasks: db.tasks.length },
    { headers: corsHeaders }
  );
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
