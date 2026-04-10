import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import { getMeterData } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  const meterData = getMeterData();

  // Map oscChannel numbers to channelIds for the client
  const meters = db.audioChannels.map((ch) => {
    const raw = meterData.get(String(ch.oscChannel));
    return {
      channelId: ch.id,
      level: raw?.level ?? 0,
    };
  });

  return Response.json({ meters }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
