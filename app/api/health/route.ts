import { corsHeaders } from "@/lib/cors";
import { readDB } from "@/lib/db";
import { withGetHandler } from "@/lib/api";

export const GET = withGetHandler(async () => {
  let dbOk = false;
  try {
    readDB();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return Response.json(
    { status: dbOk ? "ok" : "degraded", db: dbOk },
    { status: dbOk ? 200 : 503, headers: corsHeaders }
  );
});

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}
