import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import { isValidOscHost, isValidPort, initOsc, destroyOsc } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json({ audioSettings: db.audioSettings }, { headers: getCorsHeaders(req) });
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();

  if (body.oscSendHost !== undefined && !isValidOscHost(body.oscSendHost)) {
    return Response.json(
      { error: "oscSendHost must be a valid IPv4 address or 'localhost'" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }
  if (body.oscSendPort !== undefined && !isValidPort(body.oscSendPort)) {
    return Response.json(
      { error: "oscSendPort must be between 1 and 65535" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }
  if (body.oscReceivePort !== undefined && !isValidPort(body.oscReceivePort)) {
    return Response.json(
      { error: "oscReceivePort must be between 1 and 65535" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const settings = { ...db.audioSettings };
    if (body.oscEnabled !== undefined) settings.oscEnabled = !!body.oscEnabled;
    if (body.oscSendHost !== undefined) settings.oscSendHost = body.oscSendHost;
    if (body.oscSendPort !== undefined) settings.oscSendPort = body.oscSendPort;
    if (body.oscReceivePort !== undefined) settings.oscReceivePort = body.oscReceivePort;
    if (body.selectedChannelId !== undefined) settings.selectedChannelId = body.selectedChannelId;

    const updatedDb = { ...db, audioSettings: settings };
    return logActivity(updatedDb, "audio", "settings", "updated", "Audio settings updated");
  });

  // Handle OSC enable/disable and connection changes
  const settings = db.audioSettings;
  const connectionChanged =
    body.oscSendHost !== undefined || body.oscSendPort !== undefined || body.oscReceivePort !== undefined;

  if (settings.oscEnabled && (body.oscEnabled === true || connectionChanged)) {
    try {
      await initOsc(settings.oscSendHost, settings.oscSendPort, settings.oscReceivePort);
    } catch {
      // Log but don't fail the API response
    }
  } else if (body.oscEnabled === false) {
    try {
      await destroyOsc();
    } catch {
      // Ignore destroy errors
    }
  }

  eventEmitter.emit("update");
  return Response.json({ audioSettings: settings }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
