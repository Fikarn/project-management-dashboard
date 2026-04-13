import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import {
  ValidationError,
  getOptionalBoolean,
  getOptionalNullableString,
  getOptionalNumber,
  getOptionalString,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
  withGetHandler,
} from "@/lib/api";
import { isValidOscHost, isValidPort, initOsc, destroyOsc } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return jsonResponse(req, { audioSettings: db.audioSettings });
});

export const POST = withErrorHandling(async (req) => {
  const body = await parseJsonObject(req);
  const oscEnabled = getOptionalBoolean(body, "oscEnabled", "oscEnabled");
  const oscSendHost = getOptionalString(body, "oscSendHost", "oscSendHost");
  const oscSendPort = getOptionalNumber(body, "oscSendPort", "oscSendPort");
  const oscReceivePort = getOptionalNumber(body, "oscReceivePort", "oscReceivePort");
  const selectedChannelId = getOptionalNullableString(body, "selectedChannelId", "selectedChannelId");

  if (oscSendHost !== undefined && !isValidOscHost(oscSendHost)) {
    throw new ValidationError("oscSendHost must be a valid IPv4 address or 'localhost'", { field: "oscSendHost" });
  }
  if (oscSendPort !== undefined && !isValidPort(oscSendPort)) {
    throw new ValidationError("oscSendPort must be between 1 and 65535", { field: "oscSendPort" });
  }
  if (oscReceivePort !== undefined && !isValidPort(oscReceivePort)) {
    throw new ValidationError("oscReceivePort must be between 1 and 65535", { field: "oscReceivePort" });
  }

  const db = await mutateDB((db) => {
    const settings = { ...db.audioSettings };
    if (oscEnabled !== undefined) settings.oscEnabled = oscEnabled;
    if (oscSendHost !== undefined) settings.oscSendHost = oscSendHost;
    if (oscSendPort !== undefined) settings.oscSendPort = oscSendPort;
    if (oscReceivePort !== undefined) settings.oscReceivePort = oscReceivePort;
    if (selectedChannelId !== undefined) settings.selectedChannelId = selectedChannelId;

    const updatedDb = { ...db, audioSettings: settings };
    return logActivity(updatedDb, "audio", "settings", "updated", "Audio settings updated");
  });

  const settings = db.audioSettings;
  const connectionChanged = oscSendHost !== undefined || oscSendPort !== undefined || oscReceivePort !== undefined;

  if (settings.oscEnabled && (oscEnabled === true || connectionChanged)) {
    try {
      await initOsc(settings.oscSendHost, settings.oscSendPort, settings.oscReceivePort);
    } catch {
      // Log but don't fail the API response
    }
  } else if (oscEnabled === false) {
    try {
      await destroyOsc();
    } catch {
      // Ignore destroy errors
    }
  }

  eventEmitter.emit("update");
  return jsonResponse(req, { audioSettings: settings });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
