import { corsHeaders } from "@/lib/cors";

export async function GET() {
  return Response.json({ status: "ok" }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}
