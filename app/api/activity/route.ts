import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 500);

  const db = readDB();
  return Response.json({ activityLog: db.activityLog.slice(0, limit) }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
