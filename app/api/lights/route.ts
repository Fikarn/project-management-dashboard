import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { LightType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  return Response.json(
    {
      lights: db.lights,
      lightingSettings: db.lightingSettings,
    },
    { headers: corsHeaders }
  );
}

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const name: string | undefined = body.name;

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400, headers: corsHeaders });
  }

  const id = generateId("light");
  const type: LightType = body.type === "infinimat" ? "infinimat" : "astra-bicolor";
  const dmxStartAddress: number = body.dmxStartAddress ?? 1;

  const db = await mutateDB((db) => {
    const light = {
      id,
      name: name.trim(),
      type,
      dmxStartAddress,
      intensity: 100,
      cct: 4500,
      on: false,
      order: db.lights.length,
    };
    const updated = { ...db, lights: [...db.lights, light] };
    return logActivity(updated, "light", id, "created", `Light "${light.name}" created`);
  });

  eventEmitter.emit("update");

  const light = db.lights.find((l) => l.id === id);
  return Response.json({ light }, { status: 201, headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
