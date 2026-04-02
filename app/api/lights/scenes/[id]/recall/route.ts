import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame, startFade } from "@/lib/dmx";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const existing = readDB().lightScenes.find((s) => s.id === id);
  if (!existing) {
    return Response.json({ error: "Scene not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  // Parse optional fade duration (seconds, 0 = instant)
  let fadeDuration = 0;
  try {
    const body = await req.json();
    fadeDuration = typeof body.fadeDuration === "number" ? Math.max(0, Math.min(10, body.fadeDuration)) : 0;
  } catch {
    // No body or invalid JSON — instant recall
  }

  if (fadeDuration > 0) {
    // Fade recall: start interpolation, persist final values when done
    const db = readDB();
    const scene = db.lightScenes.find((s) => s.id === id)!;

    startFade(db.lights, scene.lightStates, db.lightingSettings, fadeDuration * 1000, () => {
      // Persist final values after fade completes
      mutateDB((db) => {
        const sc = db.lightScenes.find((s) => s.id === id);
        if (!sc) return db;
        const updated = {
          ...db,
          lights: db.lights.map((l) => {
            const state = sc.lightStates.find((ls) => ls.lightId === l.id);
            if (!state) return l;
            return {
              ...l,
              intensity: state.intensity,
              cct: state.cct,
              on: state.on,
              red: state.red,
              green: state.green,
              blue: state.blue,
              colorMode: state.colorMode,
              gmTint: state.gmTint,
            };
          }),
        };
        return logActivity(updated, "scene", id, "recalled", `Scene "${sc.name}" recalled (${fadeDuration}s fade)`);
      })
        .then(() => eventEmitter.emit("update"))
        .catch((err) => console.error("Failed to persist fade result:", err));
    });

    return Response.json({ ok: true, fading: true, fadeDuration }, { headers: getCorsHeaders(req) });
  }

  // Instant recall (original behavior)
  const db = await mutateDB((db) => {
    const scene = db.lightScenes.find((s) => s.id === id)!;
    const updated = {
      ...db,
      lights: db.lights.map((l) => {
        const state = scene.lightStates.find((ls) => ls.lightId === l.id);
        if (!state) return l;
        return {
          ...l,
          intensity: state.intensity,
          cct: state.cct,
          on: state.on,
          red: state.red,
          green: state.green,
          blue: state.blue,
          colorMode: state.colorMode,
          gmTint: state.gmTint,
        };
      }),
    };
    return logActivity(updated, "scene", id, "recalled", `Scene "${scene.name}" recalled`);
  });

  try {
    await sendDmxFrame(db.lights, db.lightingSettings);
  } catch (err) {
    console.error("DMX send failed during scene recall:", err);
  }
  eventEmitter.emit("update");

  return Response.json({ ok: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
