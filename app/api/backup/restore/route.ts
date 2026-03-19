import { readDB, writeDB } from "@/lib/db";
import { autoBackup } from "@/lib/backup";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";

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
