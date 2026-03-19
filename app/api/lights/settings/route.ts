import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { initDmx, destroyDmx } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  return Response.json({ lightingSettings: db.lightingSettings }, { headers: corsHeaders });
}

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();

  const db = await mutateDB((db) => ({
    ...db,
    lightingSettings: {
      ...db.lightingSettings,
      ...(body.apolloBridgeIp !== undefined && { apolloBridgeIp: body.apolloBridgeIp }),
      ...(body.dmxUniverse !== undefined && { dmxUniverse: body.dmxUniverse }),
      ...(body.dmxEnabled !== undefined && { dmxEnabled: body.dmxEnabled }),
      ...(body.selectedLightId !== undefined && { selectedLightId: body.selectedLightId }),
      ...(body.selectedSceneId !== undefined && { selectedSceneId: body.selectedSceneId }),
    },
  }));

  // Reinitialize DMX if connection settings changed
  if (body.dmxEnabled !== undefined || body.apolloBridgeIp !== undefined || body.dmxUniverse !== undefined) {
    if (db.lightingSettings.dmxEnabled) {
      await initDmx(db.lightingSettings.apolloBridgeIp, db.lightingSettings.dmxUniverse);
    } else {
      await destroyDmx();
    }
  }

  eventEmitter.emit("update");

  return Response.json({ lightingSettings: db.lightingSettings }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
