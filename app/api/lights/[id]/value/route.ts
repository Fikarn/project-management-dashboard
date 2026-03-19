import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame, clearLiveState } from "@/lib/dmx";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();

  const existing = readDB().lights.find((l) => l.id === id);
  if (!existing) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: corsHeaders });
  }

  const db = await mutateDB((db) => ({
    ...db,
    lights: db.lights.map((l) => {
      if (l.id !== id) return l;
      return {
        ...l,
        ...(body.intensity !== undefined && { intensity: Math.max(0, Math.min(100, body.intensity)) }),
        ...(body.cct !== undefined && { cct: Math.max(2700, Math.min(6500, body.cct)) }),
        ...(body.on !== undefined && { on: body.on }),
      };
    }),
  }));

  // Clear live state — persisted values are now authoritative
  clearLiveState(id);

  // Send DMX with persisted values
  await sendDmxFrame(db.lights, db.lightingSettings);

  eventEmitter.emit("update");

  return Response.json(
    { light: db.lights.find((l) => l.id === id) },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
