import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { isDmxConnected, checkBridgeReachable } from "@/lib/dmx";
import { withGetHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
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
    { headers: getCorsHeaders(req) }
  );
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
