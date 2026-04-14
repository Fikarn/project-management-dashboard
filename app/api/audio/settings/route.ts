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
import { destroyOsc, initOsc, isValidOscHost, isValidPort, primeOscTransport } from "@/lib/osc";
import { markAudioConsoleAssumed } from "@/lib/audio-console";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return jsonResponse(req, { audioSettings: db.audioSettings });
});

export const POST = withErrorHandling(async (req) => {
  const body = await parseJsonObject(req);
  const currentDb = readDB();
  const oscEnabled = getOptionalBoolean(body, "oscEnabled", "oscEnabled");
  const oscSendHost = getOptionalString(body, "oscSendHost", "oscSendHost");
  const oscSendPort = getOptionalNumber(body, "oscSendPort", "oscSendPort");
  const oscReceivePort = getOptionalNumber(body, "oscReceivePort", "oscReceivePort");
  const selectedChannelId = getOptionalNullableString(body, "selectedChannelId", "selectedChannelId");
  const selectedMixTargetId = getOptionalString(body, "selectedMixTargetId", "selectedMixTargetId");
  const expectedPeakData = getOptionalBoolean(body, "expectedPeakData", "expectedPeakData");
  const expectedSubmixLock = getOptionalBoolean(body, "expectedSubmixLock", "expectedSubmixLock");
  const expectedCompatibilityMode = getOptionalBoolean(body, "expectedCompatibilityMode", "expectedCompatibilityMode");
  const fadersPerBank = getOptionalNumber(body, "fadersPerBank", "fadersPerBank");

  if (oscSendHost !== undefined && !isValidOscHost(oscSendHost)) {
    throw new ValidationError("oscSendHost must be a valid IPv4 address or 'localhost'", { field: "oscSendHost" });
  }
  if (oscSendPort !== undefined && !isValidPort(oscSendPort)) {
    throw new ValidationError("oscSendPort must be between 1 and 65535", { field: "oscSendPort" });
  }
  if (oscReceivePort !== undefined && !isValidPort(oscReceivePort)) {
    throw new ValidationError("oscReceivePort must be between 1 and 65535", { field: "oscReceivePort" });
  }
  if (fadersPerBank !== undefined && (!Number.isInteger(fadersPerBank) || fadersPerBank < 1 || fadersPerBank > 24)) {
    throw new ValidationError("fadersPerBank must be between 1 and 24", { field: "fadersPerBank" });
  }

  const connectionChanged = oscSendHost !== undefined || oscSendPort !== undefined || oscReceivePort !== undefined;
  const enableChanged = oscEnabled !== undefined && oscEnabled !== currentDb.audioSettings.oscEnabled;
  const needsTransportReinit = enableChanged || connectionChanged;

  const db = await mutateDB((db) => {
    if (
      selectedChannelId !== undefined &&
      selectedChannelId !== null &&
      !db.audioChannels.some((channel) => channel.id === selectedChannelId)
    ) {
      throw new ValidationError("selectedChannelId must reference an existing strip", { field: "selectedChannelId" });
    }
    if (selectedMixTargetId !== undefined && !db.audioMixTargets.some((target) => target.id === selectedMixTargetId)) {
      throw new ValidationError("selectedMixTargetId must reference an existing output mix", {
        field: "selectedMixTargetId",
      });
    }

    const settings = { ...db.audioSettings };
    if (oscEnabled !== undefined) settings.oscEnabled = oscEnabled;
    if (oscSendHost !== undefined) settings.oscSendHost = oscSendHost;
    if (oscSendPort !== undefined) settings.oscSendPort = oscSendPort;
    if (oscReceivePort !== undefined) settings.oscReceivePort = oscReceivePort;
    if (selectedChannelId !== undefined) settings.selectedChannelId = selectedChannelId;
    if (selectedMixTargetId !== undefined) settings.selectedMixTargetId = selectedMixTargetId;
    if (expectedPeakData !== undefined) settings.expectedPeakData = expectedPeakData;
    if (expectedSubmixLock !== undefined) settings.expectedSubmixLock = expectedSubmixLock;
    if (expectedCompatibilityMode !== undefined) settings.expectedCompatibilityMode = expectedCompatibilityMode;
    if (fadersPerBank !== undefined) settings.fadersPerBank = fadersPerBank;

    const updatedDb = {
      ...db,
      audioSettings:
        needsTransportReinit || connectionChanged ? markAudioConsoleAssumed(settings, "startup") : settings,
    };
    return logActivity(updatedDb, "audio", "settings", "updated", "Audio settings updated");
  });

  const settings = db.audioSettings;
  const selectedMixTargetChanged = selectedMixTargetId !== undefined;

  if (settings.oscEnabled && (needsTransportReinit || selectedMixTargetChanged)) {
    try {
      if (needsTransportReinit) {
        await initOsc(settings.oscSendHost, settings.oscSendPort, settings.oscReceivePort);
      }
      const selectedMixTarget = db.audioMixTargets.find((target) => target.id === settings.selectedMixTargetId) ?? null;
      await primeOscTransport(selectedMixTarget?.oscChannel);
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
