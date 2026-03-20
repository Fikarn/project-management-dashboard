import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 500);

  const db = readDB();
  return Response.json({ activityLog: db.activityLog.slice(0, limit) }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
