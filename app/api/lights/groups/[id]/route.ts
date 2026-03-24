import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { sendDmxFrame } from "@/lib/dmx";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import { getCctRange } from "@/lib/light-types";

export const GET = withGetHandler(async (_req: Request, { params }: { params: { id: string } }) => {
  const db = readDB();
  const group = db.lightGroups.find((g) => g.id === params.id);
  if (!group) {
    return Response.json({ error: "Group not found" }, { status: 404, headers: corsHeaders });
  }
  const lights = db.lights.filter((l) => l.groupId === params.id);
  return Response.json({ group, lights }, { headers: corsHeaders });
});

/** PUT — rename group */
export const PUT = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return Response.json({ error: "Group name is required" }, { status: 400, headers: corsHeaders });
  }

  const existing = readDB().lightGroups.find((g) => g.id === params.id);
  if (!existing) {
    return Response.json({ error: "Group not found" }, { status: 404, headers: corsHeaders });
  }

  const db = await mutateDB((db) => ({
    ...db,
    lightGroups: db.lightGroups.map((g) => (g.id === params.id ? { ...g, name } : g)),
  }));

  eventEmitter.emit("update");
  return Response.json({ group: db.lightGroups.find((g) => g.id === params.id) }, { headers: corsHeaders });
});

/** DELETE — remove group, unassign lights */
export const DELETE = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const existing = readDB().lightGroups.find((g) => g.id === params.id);
  if (!existing) {
    return Response.json({ error: "Group not found" }, { status: 404, headers: corsHeaders });
  }

  await mutateDB((db) => {
    const updated = {
      ...db,
      lightGroups: db.lightGroups.filter((g) => g.id !== params.id),
      lights: db.lights.map((l) => (l.groupId === params.id ? { ...l, groupId: null } : l)),
    };
    return logActivity(updated, "light", params.id, "deleted", `Group "${existing.name}" deleted`);
  });

  eventEmitter.emit("update");
  return Response.json({ deleted: true }, { headers: corsHeaders });
});

/** PATCH — set values on all lights in group (intensity, cct, on/off) */
export const PATCH = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json();

  const existing = readDB().lightGroups.find((g) => g.id === params.id);
  if (!existing) {
    return Response.json({ error: "Group not found" }, { status: 404, headers: corsHeaders });
  }

  const db = await mutateDB((db) => ({
    ...db,
    lights: db.lights.map((l) => {
      if (l.groupId !== params.id) return l;
      const [cctMin, cctMax] = getCctRange(l.type);
      return {
        ...l,
        ...(body.intensity !== undefined && { intensity: Math.max(0, Math.min(100, body.intensity)) }),
        ...(body.cct !== undefined && { cct: Math.max(cctMin, Math.min(cctMax, body.cct)) }),
        ...(body.on !== undefined && { on: body.on }),
      };
    }),
  }));

  try {
    await sendDmxFrame(db.lights, db.lightingSettings);
  } catch (err) {
    console.error("DMX send failed:", err);
  }

  eventEmitter.emit("update");
  return Response.json({ lights: db.lights.filter((l) => l.groupId === params.id) }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
