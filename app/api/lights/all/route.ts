import { mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame } from "@/lib/dmx";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const body = await req.json();
  const on: boolean = body.on ?? true;

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      lights: db.lights.map((l) => ({ ...l, on })),
    };
    return logActivity(updated, "light", "all", on ? "all_on" : "all_off", `All lights turned ${on ? "on" : "off"}`);
  });

  await sendDmxFrame(db.lights, db.lightingSettings);
  eventEmitter.emit("update");

  return Response.json({ ok: true, on }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
