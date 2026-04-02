import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { initDmx, isDmxConnected, sendDmxFrame, checkBridgeReachable } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req) => {
  const db = readDB();
  const { dmxEnabled, apolloBridgeIp, dmxUniverse } = db.lightingSettings;

  if (!dmxEnabled || !apolloBridgeIp) {
    return Response.json(
      { initialized: false, reachable: false, enabled: dmxEnabled },
      { headers: getCorsHeaders(req) }
    );
  }

  // Initialize sACN sender if not already connected
  if (!isDmxConnected()) {
    await initDmx(apolloBridgeIp, dmxUniverse);
  }

  // Send current stored values to all lights
  try {
    await sendDmxFrame(db.lights, db.lightingSettings);
  } catch (err) {
    console.error("DMX init frame failed:", err);
  }

  const reachable = await checkBridgeReachable(apolloBridgeIp);

  return Response.json({ initialized: isDmxConnected(), reachable, enabled: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
