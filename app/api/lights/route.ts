import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import type { LightType } from "@/lib/types";
import { getConfig } from "@/lib/light-types";

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

  const id = generateId("light");
  const type: LightType = VALID_TYPES.includes(body.type) ? body.type : "astra-bicolor";
  const dmxStartAddress: number = body.dmxStartAddress ?? 1;
  const config = getConfig(type);

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
