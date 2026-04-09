import { getCorsHeaders } from "@/lib/cors";
import { readDB } from "@/lib/db";
import { withGetHandler } from "@/lib/api";
import { getBackupHealth } from "@/lib/backup";

export const GET = withGetHandler(async (req: Request) => {
  let dbOk = false;
  try {
    readDB();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const backup = getBackupHealth();

  return Response.json(
    { status: dbOk ? "ok" : "degraded", db: dbOk, backup },
    { status: dbOk ? 200 : 503, headers: getCorsHeaders(req) }
  );
});

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: getCorsHeaders(req) });
}
