import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import type { LightType } from "@/lib/types";
import { getConfig } from "@/lib/light-types";
import { findDmxOverlap } from "@/lib/dmx";

export const dynamic = "force-dynamic";

const VALID_TYPES: LightType[] = ["astra-bicolor", "infinimat", "infinibar-pb12"];

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json(
    {
      lights: db.lights,
      lightGroups: db.lightGroups,
      lightingSettings: db.lightingSettings,
    },
    { headers: getCorsHeaders(req) }
  );
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const name: string | undefined = body.name;

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  if (name.trim().length > 50) {
    return Response.json(
      { error: "Name must be 50 characters or fewer" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    return Response.json(
      { error: `Invalid light type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const id = generateId("light");
  const type: LightType = body.type ?? "astra-bicolor";
  const dmxStartAddress: number = body.dmxStartAddress ?? 1;
  const config = getConfig(type);

  if (!Number.isInteger(dmxStartAddress) || dmxStartAddress < 1 || dmxStartAddress > 512 - config.channelCount + 1) {
    return Response.json(
      {
        error: `DMX start address must be between 1 and ${512 - config.channelCount + 1} for ${type} (${config.channelCount} channels)`,
      },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const currentDb = readDB();
  const overlap = findDmxOverlap(currentDb.lights, dmxStartAddress, config.channelCount);
  if (overlap) {
    return Response.json(
      { error: `DMX address overlaps with "${overlap.name}" (address ${overlap.dmxStartAddress})` },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const light = {
      id,
      name: name.trim(),
      type,
      dmxStartAddress,
      intensity: 100,
      cct: config.defaultCct,
      on: false,
      order: db.lights.length,
      red: 0,
      green: 0,
      blue: 0,
      colorMode: "cct" as const,
      gmTint: 0,
      groupId: body.groupId ?? null,
      effect: null,
      spatialX: null,
      spatialY: null,
      spatialRotation: 0,
    };
    const updated = { ...db, lights: [...db.lights, light] };
    return logActivity(updated, "light", id, "created", `Light "${light.name}" created`);
  });

  eventEmitter.emit("update");

  const light = db.lights.find((l) => l.id === id);
  return Response.json({ light }, { status: 201, headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
