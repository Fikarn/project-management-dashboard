import { getCorsHeaders } from "@/lib/cors";
import { readDB } from "@/lib/db";
import { withGetHandler } from "@/lib/api";

export const GET = withGetHandler(async (req: Request) => {
  let dbOk = false;
  try {
    readDB();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return Response.json(
    { status: dbOk ? "ok" : "degraded", db: dbOk },
    { status: dbOk ? 200 : 503, headers: getCorsHeaders(req) }
  );
});

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: getCorsHeaders(req) });
}
