import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import { validateGain, validateFader, sendOscThrottled, updateOscLiveState } from "@/lib/osc";

export const dynamic = "force-dynamic";

/** Live OSC send without DB persistence — used during slider drag. */
export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const channelId: string | undefined = body.channelId;

  if (!channelId || typeof channelId !== "string") {
    return Response.json({ error: "channelId is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  if (body.gain !== undefined && !validateGain(body.gain)) {
    return Response.json({ error: "gain must be between 0 and 75" }, { status: 400, headers: getCorsHeaders(req) });
  }
  if (body.fader !== undefined && !validateFader(body.fader)) {
    return Response.json({ error: "fader must be between 0.0 and 1.0" }, { status: 400, headers: getCorsHeaders(req) });
  }

  const db = readDB();
  const channel = db.audioChannels.find((ch) => ch.id === channelId);
  if (!channel) {
    return Response.json({ error: "Audio channel not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  const values: Record<string, number | boolean> = {};
  if (body.gain !== undefined) values.gain = body.gain;
  if (body.fader !== undefined) values.fader = body.fader;
  if (body.mute !== undefined) values.mute = body.mute;
  if (body.solo !== undefined) values.solo = body.solo;

  updateOscLiveState(channelId, values);

  try {
    sendOscThrottled(channel, values);
  } catch {
    // OSC failure must not prevent API response
  }

  return Response.json({ ok: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
