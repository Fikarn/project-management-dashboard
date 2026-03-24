import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { initDmx, isDmxConnected, sendDmxFrame, checkBridgeReachable } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async () => {
  const db = readDB();
  const { dmxEnabled, apolloBridgeIp, dmxUniverse } = db.lightingSettings;

  if (!dmxEnabled || !apolloBridgeIp) {
    return Response.json({ initialized: false, reachable: false, enabled: dmxEnabled }, { headers: corsHeaders });
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

  return Response.json({ initialized: isDmxConnected(), reachable, enabled: true }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
