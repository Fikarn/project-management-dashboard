import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const PUT = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await req.json();

  const existing = readDB().lightScenes.find((s) => s.id === id);
  if (!existing) {
    return Response.json({ error: "Scene not found" }, { status: 404, headers: corsHeaders });
  }

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      lightScenes: db.lightScenes.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          ...(body.name !== undefined && { name: body.name.trim() }),
        };
      }),
    };
    return logActivity(updated, "scene", id, "updated", `Scene "${body.name ?? existing.name}" updated`);
  });

  eventEmitter.emit("update");

  return Response.json({ scene: db.lightScenes.find((s) => s.id === id) }, { headers: corsHeaders });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const existing = readDB().lightScenes.find((s) => s.id === id);
  if (!existing) {
    return Response.json({ error: "Scene not found" }, { status: 404, headers: corsHeaders });
  }

  await mutateDB((db) => {
    const updated = {
      ...db,
      lightScenes: db.lightScenes.filter((s) => s.id !== id),
      lightingSettings: {
        ...db.lightingSettings,
        selectedSceneId: db.lightingSettings.selectedSceneId === id ? null : db.lightingSettings.selectedSceneId,
      },
    };
    return logActivity(updated, "scene", id, "deleted", `Scene "${existing.name}" deleted`);
  });

  eventEmitter.emit("update");

  return Response.json({ deleted: true }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
