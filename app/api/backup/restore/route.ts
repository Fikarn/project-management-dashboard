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
