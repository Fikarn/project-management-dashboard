import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import { registerEffect, unregisterEffect } from "@/lib/effects";
import type { EffectType } from "@/lib/types";

const VALID_EFFECTS: EffectType[] = ["pulse", "strobe", "candle"];

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await req.json();

  const db = readDB();
  const light = db.lights.find((l) => l.id === id);
  if (!light) {
    return Response.json({ error: "Light not found" }, { status: 404, headers: corsHeaders });
  }

  // Clear effect
  if (body.effect === null) {
    const updated = await mutateDB((db) => {
      const result = {
        ...db,
        lights: db.lights.map((l) => (l.id === id ? { ...l, effect: null } : l)),
      };
      return logActivity(result, "light", id, "effect_cleared", `Effect cleared on "${light.name}"`);
    });

    const updatedLight = updated.lights.find((l) => l.id === id)!;
    unregisterEffect(updatedLight, updated.lights, updated.lightingSettings);
    eventEmitter.emit("update");

    return Response.json({ light: updatedLight }, { headers: corsHeaders });
  }

  // Set effect
  const effectType = body.effect?.type;
  if (!VALID_EFFECTS.includes(effectType)) {
    return Response.json({ error: "Invalid effect type" }, { status: 400, headers: corsHeaders });
  }

  const speed = Math.max(1, Math.min(10, Math.round(body.effect?.speed ?? 5)));
  const effect = { type: effectType as EffectType, speed };

  const updated = await mutateDB((db) => {
    const result = {
      ...db,
      lights: db.lights.map((l) => (l.id === id ? { ...l, effect } : l)),
    };
    return logActivity(result, "light", id, "effect_set", `${effectType} effect on "${light.name}" (speed ${speed})`);
  });

  const updatedLight = updated.lights.find((l) => l.id === id)!;
  registerEffect(updatedLight, effect, updated.lightingSettings);
  eventEmitter.emit("update");

  return Response.json({ light: updatedLight }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
