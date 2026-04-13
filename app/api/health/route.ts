import { getCorsHeaders } from "@/lib/cors";
import { readDB } from "@/lib/db";
import { jsonResponse, withGetHandler } from "@/lib/api";
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
  const backupOk = backup.failureCount === 0;
  const status = dbOk && backupOk ? "ok" : "degraded";

  return jsonResponse(
    req,
    {
      status,
      checks: {
        db: { ok: dbOk },
        backup: {
          ok: backupOk,
          lastBackup: backup.lastBackup,
          failureCount: backup.failureCount,
        },
      },
    },
    { status: dbOk ? 200 : 503 }
  );
});

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: getCorsHeaders(req) });
}
