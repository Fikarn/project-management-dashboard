import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame, clearLiveState } from "@/lib/dmx";
import {
  NotFoundError,
  getOptionalBoolean,
  getOptionalEnum,
  getOptionalNumber,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
} from "@/lib/api";
import { getCctRange } from "@/lib/light-types";

const VALID_COLOR_MODES = ["cct", "rgb", "hsi"] as const;

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await parseJsonObject(req);
  const intensity = getOptionalNumber(body, "intensity", "intensity");
  const cct = getOptionalNumber(body, "cct", "cct");
  const on = getOptionalBoolean(body, "on", "on");
  const red = getOptionalNumber(body, "red", "red");
  const green = getOptionalNumber(body, "green", "green");
  const blue = getOptionalNumber(body, "blue", "blue");
  const colorMode = getOptionalEnum(body, "colorMode", VALID_COLOR_MODES, "colorMode");
  const gmTint =
    body.gmTint === undefined ? undefined : body.gmTint === null ? null : getOptionalNumber(body, "gmTint", "gmTint");

  const existing = readDB().lights.find((l) => l.id === id);
  if (!existing) {
    throw new NotFoundError("Light not found", { lightId: id });
  }

  const [cctMin, cctMax] = getCctRange(existing.type);

  const db = await mutateDB((db) => ({
    ...db,
    lights: db.lights.map((l) => {
      if (l.id !== id) return l;
      return {
        ...l,
        ...(intensity !== undefined && { intensity: Math.max(0, Math.min(100, intensity)) }),
        ...(cct !== undefined && { cct: Math.max(cctMin, Math.min(cctMax, cct)) }),
        ...(on !== undefined && { on }),
        ...(red !== undefined && { red: Math.max(0, Math.min(255, red)) }),
        ...(green !== undefined && { green: Math.max(0, Math.min(255, green)) }),
        ...(blue !== undefined && { blue: Math.max(0, Math.min(255, blue)) }),
        ...(colorMode !== undefined && { colorMode }),
        ...(gmTint !== undefined && {
          gmTint: gmTint === null ? null : Math.max(-100, Math.min(100, gmTint)),
        }),
      };
    }),
  }));

  // Clear live state — persisted values are now authoritative
  clearLiveState(id);

  // Send DMX with persisted values
  try {
    await sendDmxFrame(db.lights, db.lightingSettings);
  } catch (err) {
    console.error("DMX send failed:", err);
  }

  eventEmitter.emit("update");

  return jsonResponse(req, { light: db.lights.find((l) => l.id === id) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
