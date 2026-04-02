import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame, clearLiveState } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";
import { getCctRange } from "@/lib/light-types";

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await req.json();

  const existing = readDB().lights.find((l) => l.id === id);
  if (!existing) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  const [cctMin, cctMax] = getCctRange(existing.type);

  const db = await mutateDB((db) => ({
    ...db,
    lights: db.lights.map((l) => {
      if (l.id !== id) return l;
      return {
        ...l,
        ...(body.intensity !== undefined && { intensity: Math.max(0, Math.min(100, body.intensity)) }),
        ...(body.cct !== undefined && { cct: Math.max(cctMin, Math.min(cctMax, body.cct)) }),
        ...(body.on !== undefined && { on: body.on }),
        ...(body.red !== undefined && { red: Math.max(0, Math.min(255, body.red)) }),
        ...(body.green !== undefined && { green: Math.max(0, Math.min(255, body.green)) }),
        ...(body.blue !== undefined && { blue: Math.max(0, Math.min(255, body.blue)) }),
        ...(body.colorMode !== undefined && {
          colorMode: (["cct", "rgb", "hsi"] as const).includes(body.colorMode) ? body.colorMode : "cct",
        }),
        ...(body.gmTint !== undefined && {
          gmTint: body.gmTint === null ? null : Math.max(-100, Math.min(100, body.gmTint)),
        }),
      };
    }),
  }));

  // Clear live state — persisted values are now authoritative
  clearLiveState(id);

  // Send DMX with persisted values
  try {
    await sendDmxFrame(db.lights, db.lightingSettings);
  } catch (err) {
    console.error("DMX send failed:", err);
  }

  eventEmitter.emit("update");

  return Response.json({ light: db.lights.find((l) => l.id === id) }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
