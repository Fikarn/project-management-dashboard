import { mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import {
  NotFoundError,
  getOptionalBoolean,
  getOptionalNumber,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
} from "@/lib/api";
import { sendOscMixTargetUpdate, validateFader } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const body = await parseJsonObject(req);
  const volume = getOptionalNumber(body, "volume", "volume");
  const mute = getOptionalBoolean(body, "mute", "mute");
  const dim = getOptionalBoolean(body, "dim", "dim");
  const mono = getOptionalBoolean(body, "mono", "mono");
  const talkback = getOptionalBoolean(body, "talkback", "talkback");

  if (volume !== undefined && !validateFader(volume)) {
    return jsonResponse(
      req,
      { error: "volume must be between 0.0 and 1.0", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const db = await mutateDB((db) => {
    const idx = db.audioMixTargets.findIndex((target) => target.id === params.id);
    if (idx === -1) throw new NotFoundError("Audio mix target not found", { mixTargetId: params.id });

    const updated = { ...db.audioMixTargets[idx] };
    if (volume !== undefined) updated.volume = volume;
    if (mute !== undefined) updated.mute = mute;
    if (updated.role === "main-out") {
      if (dim !== undefined) updated.dim = dim;
      if (mono !== undefined) updated.mono = mono;
      if (talkback !== undefined) updated.talkback = talkback;
    }

    const audioMixTargets = [...db.audioMixTargets];
    audioMixTargets[idx] = updated;
    return { ...db, audioMixTargets };
  });

  const mixTarget = db.audioMixTargets.find((target) => target.id === params.id);
  if (mixTarget) {
    try {
      await sendOscMixTargetUpdate(mixTarget, { volume, mute, dim, mono, talkback });
    } catch {
      /* non-blocking for UI state */
    }
  }

  eventEmitter.emit("update");
  return jsonResponse(req, { mixTarget });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
