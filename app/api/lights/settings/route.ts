import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { initDmx, destroyDmx, isValidIpv4, isValidUniverse, sendDmxFrame } from "@/lib/dmx";
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
import type { SpatialMarker } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseMarker(value: unknown, field: "cameraMarker" | "subjectMarker"): SpatialMarker | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object or null`, { field });
  }

  const { x, y, rotation } = value as Record<string, unknown>;
  if (
    typeof x !== "number" ||
    !Number.isFinite(x) ||
    typeof y !== "number" ||
    !Number.isFinite(y) ||
    typeof rotation !== "number" ||
    !Number.isFinite(rotation)
  ) {
    throw new ValidationError(`${field} must contain finite numeric x, y, and rotation values`, { field });
  }

  return { x, y, rotation };
}

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return jsonResponse(req, { lightingSettings: db.lightingSettings });
});

export const POST = withErrorHandling(async (req) => {
  const body = await parseJsonObject(req);
  const apolloBridgeIp = getOptionalString(body, "apolloBridgeIp", "apolloBridgeIp");
  const dmxUniverse = getOptionalNumber(body, "dmxUniverse", "dmxUniverse");
  const dmxEnabled = getOptionalBoolean(body, "dmxEnabled", "dmxEnabled");
  const selectedLightId = getOptionalNullableString(body, "selectedLightId", "selectedLightId");
  const selectedSceneId = getOptionalNullableString(body, "selectedSceneId", "selectedSceneId");
  const grandMasterRaw = getOptionalNumber(body, "grandMaster", "grandMaster");
  const cameraMarker = parseMarker(body.cameraMarker, "cameraMarker");
  const subjectMarker = parseMarker(body.subjectMarker, "subjectMarker");

  if (apolloBridgeIp !== undefined && !isValidIpv4(apolloBridgeIp)) {
    throw new ValidationError("Invalid IP address. Must be a valid IPv4 address.", { field: "apolloBridgeIp" });
  }

  if (dmxUniverse !== undefined && !isValidUniverse(dmxUniverse)) {
    throw new ValidationError("Invalid DMX universe. Must be an integer between 1 and 63999.", {
      field: "dmxUniverse",
    });
  }

  const grandMaster = grandMasterRaw === undefined ? undefined : Math.max(0, Math.min(100, Math.round(grandMasterRaw)));

  const db = await mutateDB((db) => ({
    ...db,
    lightingSettings: {
      ...db.lightingSettings,
      ...(apolloBridgeIp !== undefined && { apolloBridgeIp }),
      ...(dmxUniverse !== undefined && { dmxUniverse }),
      ...(dmxEnabled !== undefined && { dmxEnabled }),
      ...(selectedLightId !== undefined && { selectedLightId }),
      ...(selectedSceneId !== undefined && { selectedSceneId }),
      ...(grandMaster !== undefined && { grandMaster }),
      ...(cameraMarker !== undefined && { cameraMarker }),
      ...(subjectMarker !== undefined && { subjectMarker }),
    },
  }));

  if (dmxEnabled !== undefined || apolloBridgeIp !== undefined || dmxUniverse !== undefined) {
    if (db.lightingSettings.dmxEnabled) {
      await initDmx(db.lightingSettings.apolloBridgeIp, db.lightingSettings.dmxUniverse);
    } else {
      await destroyDmx();
    }
  }

  if (grandMaster !== undefined) {
    try {
      await sendDmxFrame(db.lights, db.lightingSettings);
    } catch (err) {
      console.error("DMX send failed after Grand Master change:", err);
    }
  }

  eventEmitter.emit("update");

  return jsonResponse(req, { lightingSettings: db.lightingSettings });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
