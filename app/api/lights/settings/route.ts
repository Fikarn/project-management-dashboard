import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { initDmx, destroyDmx, isValidIpv4, isValidUniverse, sendDmxFrame } from "@/lib/dmx";
import { withErrorHandling, withGetHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json({ lightingSettings: db.lightingSettings }, { headers: getCorsHeaders(req) });
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();

  // Validate IP address if provided
  if (body.apolloBridgeIp !== undefined && !isValidIpv4(body.apolloBridgeIp)) {
    return Response.json(
      { error: "Invalid IP address. Must be a valid IPv4 address." },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  // Validate DMX universe if provided
  if (body.dmxUniverse !== undefined && !isValidUniverse(body.dmxUniverse)) {
    return Response.json(
      { error: "Invalid DMX universe. Must be an integer between 1 and 63999." },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => ({
    ...db,
    lightingSettings: {
      ...db.lightingSettings,
      ...(body.apolloBridgeIp !== undefined && { apolloBridgeIp: body.apolloBridgeIp }),
      ...(body.dmxUniverse !== undefined && { dmxUniverse: body.dmxUniverse }),
      ...(body.dmxEnabled !== undefined && { dmxEnabled: body.dmxEnabled }),
      ...(body.selectedLightId !== undefined && { selectedLightId: body.selectedLightId }),
      ...(body.selectedSceneId !== undefined && { selectedSceneId: body.selectedSceneId }),
      ...(body.grandMaster !== undefined && {
        grandMaster: Math.max(0, Math.min(100, Math.round(Number(body.grandMaster)))),
      }),
      ...(body.cameraMarker !== undefined && { cameraMarker: body.cameraMarker }),
      ...(body.subjectMarker !== undefined && { subjectMarker: body.subjectMarker }),
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

  // Resend DMX when Grand Master changes (applies new multiplier to all lights)
  if (body.grandMaster !== undefined) {
    try {
      await sendDmxFrame(db.lights, db.lightingSettings);
    } catch (err) {
      console.error("DMX send failed after Grand Master change:", err);
    }
  }

  eventEmitter.emit("update");

  return Response.json({ lightingSettings: db.lightingSettings }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
