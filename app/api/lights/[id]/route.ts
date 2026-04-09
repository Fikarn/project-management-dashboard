import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { LightType } from "@/lib/types";
import { getConfig, getCctRange } from "@/lib/light-types";
import { findDmxOverlap } from "@/lib/dmx";

const VALID_TYPES: LightType[] = ["astra-bicolor", "infinimat", "infinibar-pb12"];

export const PUT = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await req.json();

  const currentDb = readDB();
  const existing = currentDb.lights.find((l) => l.id === id);
  if (!existing) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  // Validate name length if provided
  if (body.name !== undefined && typeof body.name === "string" && body.name.trim().length > 50) {
    return Response.json(
      { error: "Name must be 50 characters or fewer" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  // Validate type if provided
  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    return Response.json(
      { error: `Invalid light type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  // Validate and check DMX address overlap if address is being changed
  if (body.dmxStartAddress !== undefined) {
    const newType =
      body.type !== undefined && VALID_TYPES.includes(body.type) ? (body.type as LightType) : existing.type;
    const config = getConfig(newType);
    const addr = body.dmxStartAddress;
    if (!Number.isInteger(addr) || addr < 1 || addr > 512 - config.channelCount + 1) {
      return Response.json(
        {
          error: `DMX start address must be between 1 and ${512 - config.channelCount + 1} for ${newType} (${config.channelCount} channels)`,
        },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
    const overlap = findDmxOverlap(currentDb.lights, addr, config.channelCount, id);
    if (overlap) {
      return Response.json(
        { error: `DMX address overlaps with "${overlap.name}" (address ${overlap.dmxStartAddress})` },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
  }

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      lights: db.lights.map((l) => {
        if (l.id !== id) return l;
        const newType = body.type !== undefined && VALID_TYPES.includes(body.type) ? (body.type as LightType) : l.type;
        // If type changed, clamp CCT to the new type's range
        const [cctMin, cctMax] = getCctRange(newType);
        const clampedCct = Math.max(cctMin, Math.min(cctMax, l.cct));
        return {
          ...l,
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.type !== undefined && VALID_TYPES.includes(body.type) && { type: newType }),
          ...(body.dmxStartAddress !== undefined && { dmxStartAddress: body.dmxStartAddress }),
          ...(body.groupId !== undefined && { groupId: body.groupId || null }),
          ...(body.spatialX !== undefined && { spatialX: body.spatialX }),
          ...(body.spatialY !== undefined && { spatialY: body.spatialY }),
          ...(body.spatialRotation !== undefined && { spatialRotation: body.spatialRotation }),
          cct: clampedCct,
        };
      }),
    };
    return logActivity(updated, "light", id, "updated", `Light "${body.name ?? existing.name}" updated`);
  });

  eventEmitter.emit("update");

  return Response.json({ light: db.lights.find((l) => l.id === id) }, { headers: getCorsHeaders(req) });
});

export const DELETE = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const existing = readDB().lights.find((l) => l.id === id);
  if (!existing) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: getCorsHeaders(req) });
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

  return Response.json({ deleted: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
