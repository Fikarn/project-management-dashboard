import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { isDmxConnected } from "@/lib/dmx";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  return Response.json(
    {
      connected: isDmxConnected(),
      enabled: db.lightingSettings.dmxEnabled,
      apolloBridgeIp: db.lightingSettings.apolloBridgeIp,
      universe: db.lightingSettings.dmxUniverse,
    },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
