import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { updateLiveState, sendDmxFrameThrottled } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const { lightId, intensity, cct, on } = body;

  if (!lightId) {
    return Response.json({ error: "lightId is required" }, { status: 400, headers: corsHeaders });
  }

  const db = readDB();
  const light = db.lights.find((l) => l.id === lightId);
  if (!light) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: corsHeaders });
  }

  // Update in-memory live state (no disk write)
  const updates: { intensity?: number; cct?: number; on?: boolean } = {};
  if (intensity !== undefined) updates.intensity = Math.max(0, Math.min(100, intensity));
  if (cct !== undefined) updates.cct = Math.max(2700, Math.min(6500, cct));
  if (on !== undefined) updates.on = on;

  updateLiveState(lightId, updates);

  // Throttled DMX send
  sendDmxFrameThrottled(db.lights, db.lightingSettings);

  return Response.json({ ok: true }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
