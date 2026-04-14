import { generateCompanionConfig } from "@/lib/companionExport";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";

export const GET = withGetHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const baseUrl = searchParams.get("baseUrl") || "http://localhost:3000";

  const config = generateCompanionConfig(baseUrl);
  const json = JSON.stringify(config, null, 2);

  return new Response(json, {
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="sse-exed-studio-control.companionconfig"',
    },
  });
});

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: getCorsHeaders(req) });
}
