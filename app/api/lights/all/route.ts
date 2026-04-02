import { mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame } from "@/lib/dmx";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const on: boolean = body.on ?? true;

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      lights: db.lights.map((l) => ({ ...l, on })),
    };
    return logActivity(updated, "light", "all", on ? "all_on" : "all_off", `All lights turned ${on ? "on" : "off"}`);
  });

  try {
    await sendDmxFrame(db.lights, db.lightingSettings);
  } catch (err) {
    console.error("DMX send failed:", err);
  }

  eventEmitter.emit("update");

  return Response.json({ ok: true, on }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
