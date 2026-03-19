import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame } from "@/lib/dmx";
import { logActivity } from "@/lib/activity";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const existing = readDB().lightScenes.find((s) => s.id === id);
  if (!existing) {
    return Response.json({ error: "Scene not found" }, { status: 404, headers: corsHeaders });
  }

  const db = await mutateDB((db) => {
    const scene = db.lightScenes.find((s) => s.id === id)!;
    const updated = {
      ...db,
      lights: db.lights.map((l) => {
        const state = scene.lightStates.find((ls) => ls.lightId === l.id);
        if (!state) return l;
        return { ...l, intensity: state.intensity, cct: state.cct, on: state.on };
      }),
    };
    return logActivity(updated, "scene", id, "recalled", `Scene "${scene.name}" recalled`);
  });

  await sendDmxFrame(db.lights, db.lightingSettings);
  eventEmitter.emit("update");

  return Response.json({ ok: true }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
