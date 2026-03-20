import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async () => {
  const db = readDB();
  return Response.json({ scenes: db.lightScenes }, { headers: corsHeaders });
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const name: string = body.name ?? "New Scene";

  const id = generateId("scene");

  const db = await mutateDB((db) => {
    const scene = {
      id,
      name: name.trim(),
      lightStates: db.lights.map((l) => ({
        lightId: l.id,
        intensity: l.intensity,
        cct: l.cct,
        on: l.on,
      })),
      createdAt: new Date().toISOString(),
      order: db.lightScenes.length,
    };
    const updated = { ...db, lightScenes: [...db.lightScenes, scene] };
    return logActivity(updated, "scene", id, "created", `Scene "${scene.name}" saved`);
  });

  eventEmitter.emit("update");

  return Response.json({ scene: db.lightScenes.find((s) => s.id === id) }, { status: 201, headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
