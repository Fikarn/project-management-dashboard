import { generateCompanionConfig } from "@/lib/companionExport";
import { corsHeaders } from "@/lib/cors";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const baseUrl = searchParams.get("baseUrl") || "http://localhost:3000";

  const config = generateCompanionConfig(baseUrl);
  const json = JSON.stringify(config, null, 2);

  return new Response(json, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="project-manager.companionconfig"',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}
