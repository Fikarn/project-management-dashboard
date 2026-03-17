import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { getViewFilter } from "@/lib/view-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const filter = getViewFilter();
  return Response.json(
    { projects: db.projects, tasks: db.tasks, filter },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
