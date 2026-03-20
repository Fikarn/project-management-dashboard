import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { isDmxConnected, checkBridgeReachable } from "@/lib/dmx";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const { dmxEnabled, apolloBridgeIp, dmxUniverse } = db.lightingSettings;

  const senderActive = isDmxConnected();
  const reachable = dmxEnabled ? await checkBridgeReachable(apolloBridgeIp) : false;

  return Response.json(
    {
      connected: senderActive,
      reachable,
      enabled: dmxEnabled,
      apolloBridgeIp,
      universe: dmxUniverse,
    },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
