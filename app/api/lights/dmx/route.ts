import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { updateLiveState, sendDmxFrameThrottled } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";
import { getCctRange } from "@/lib/light-types";
import type { ColorMode } from "@/lib/types";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const { lightId, intensity, cct, on, red, green, blue, colorMode, gmTint } = body;

  if (!lightId) {
    return Response.json({ error: "lightId is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  const db = readDB();
  const light = db.lights.find((l) => l.id === lightId);
  if (!light) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  const [cctMin, cctMax] = getCctRange(light.type);

  // Update in-memory live state (no disk write)
  const updates: {
    intensity?: number;
    cct?: number;
    on?: boolean;
    red?: number;
    green?: number;
    blue?: number;
    colorMode?: ColorMode;
    gmTint?: number | null;
  } = {};
  if (intensity !== undefined) updates.intensity = Math.max(0, Math.min(100, intensity));
  if (cct !== undefined) updates.cct = Math.max(cctMin, Math.min(cctMax, cct));
  if (on !== undefined) updates.on = on;
  if (red !== undefined) updates.red = Math.max(0, Math.min(255, red));
  if (green !== undefined) updates.green = Math.max(0, Math.min(255, green));
  if (blue !== undefined) updates.blue = Math.max(0, Math.min(255, blue));
  if (colorMode !== undefined)
    updates.colorMode = (["cct", "rgb", "hsi"] as const).includes(colorMode) ? colorMode : "cct";
  if (gmTint !== undefined) updates.gmTint = gmTint === null ? null : Math.max(-100, Math.min(100, gmTint));

  updateLiveState(lightId, updates);

  // Throttled DMX send
  sendDmxFrameThrottled(db.lights, db.lightingSettings);

  return Response.json({ ok: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
