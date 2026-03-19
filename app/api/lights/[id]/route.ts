import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { LightType } from "@/lib/types";

export const PUT = withErrorHandling(async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  const body = await req.json();

  const existing = readDB().lights.find((l) => l.id === id);
  if (!existing) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: corsHeaders });
  }

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      lights: db.lights.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.type !== undefined && { type: body.type as LightType }),
          ...(body.dmxStartAddress !== undefined && { dmxStartAddress: body.dmxStartAddress }),
        };
      }),
    };
    return logActivity(updated, "light", id, "updated", `Light "${body.name ?? existing.name}" updated`);
  });

  eventEmitter.emit("update");

  return Response.json(
    { light: db.lights.find((l) => l.id === id) },
    { headers: corsHeaders }
  );
});

export const DELETE = withErrorHandling(async (
  _req: Request,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  const existing = readDB().lights.find((l) => l.id === id);
  if (!existing) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: corsHeaders });
  }

  await mutateDB((db) => {
    const updated = {
      ...db,
      lights: db.lights.filter((l) => l.id !== id),
      lightScenes: db.lightScenes.map((s) => ({
        ...s,
        lightStates: s.lightStates.filter((ls) => ls.lightId !== id),
      })),
      lightingSettings: {
        ...db.lightingSettings,
        selectedLightId: db.lightingSettings.selectedLightId === id ? null : db.lightingSettings.selectedLightId,
      },
    };
    return logActivity(updated, "light", id, "deleted", `Light "${existing.name}" deleted`);
  });

  eventEmitter.emit("update");

  return Response.json({ deleted: true }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
