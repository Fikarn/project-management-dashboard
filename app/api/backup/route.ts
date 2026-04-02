import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  const json = JSON.stringify(db, null, 2);

  return new Response(json, {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="db-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
