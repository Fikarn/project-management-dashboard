import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const json = JSON.stringify(db, null, 2);

  return new Response(json, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="db-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
