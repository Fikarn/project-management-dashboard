import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import { getMeterData } from "@/lib/osc";
import { getAudioBus } from "@/lib/audio-console";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  const meterData = getMeterData();

  const meters = db.audioChannels.map((ch) => {
    const raw = meterData.get(`${getAudioBus(ch)}:${ch.oscChannel}`);
    return {
      channelId: ch.id,
      left: raw?.left ?? 0,
      right: raw?.right ?? 0,
      level: raw?.level ?? 0,
      updatedAt: raw?.updatedAt ?? null,
    };
  });

  return Response.json({ meters }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
