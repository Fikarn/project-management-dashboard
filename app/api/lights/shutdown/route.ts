import { readDB } from "@/lib/db";
import { destroyDmx, sendDmxFrame, updateLiveState } from "@/lib/dmx";
import { corsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async () => {
  try {
    const db = readDB();
    // Set all lights to off in live state and send blackout frame
    for (const light of db.lights) {
      updateLiveState(light.id, { intensity: 0, cct: light.cct, on: false });
    }
    await sendDmxFrame(db.lights, { ...db.lightingSettings, dmxEnabled: true });
    await destroyDmx();
  } catch (err) {
    console.error("DMX shutdown error:", err);
  }
  return Response.json({ ok: true }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
