import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import { truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

function getAudioLcdText(key: string): string {
  const db = readDB();
  const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);

  switch (key) {
    // Dial 1 LCD: channel 1 name + gain
    case "audio_ch_nav": {
      const ch = sorted[0];
      if (!ch) return "CH 1\\n(none)";
      const name = truncate(ch.name, 12);
      return `${name}\\n${ch.gain}dB${ch.mute ? " M" : ""}`;
    }
    // Dial 2 LCD: channel 2 name + gain
    case "audio_gain1": {
      const ch = sorted[1];
      if (!ch) return "CH 2\\n(none)";
      const name = truncate(ch.name, 12);
      return `${name}\\n${ch.gain}dB${ch.mute ? " M" : ""}`;
    }
    // Dial 3 LCD: channel 3 name + gain
    case "audio_gain2": {
      const ch = sorted[2];
      if (!ch) return "CH 3\\n(none)";
      const name = truncate(ch.name, 12);
      return `${name}\\n${ch.gain}dB${ch.mute ? " M" : ""}`;
    }
    // Dial 4 LCD: channel 4 name + gain
    case "audio_gain3": {
      const ch = sorted[3];
      if (!ch) return "CH 4\\n(none)";
      const name = truncate(ch.name, 12);
      return `${name}\\n${ch.gain}dB${ch.mute ? " M" : ""}`;
    }
    default:
      return "--";
  }
}

export const GET = withGetHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return Response.json({ error: "Missing ?key= parameter" }, { status: 400, headers: getCorsHeaders(req) });
  }

  const text = getAudioLcdText(key);
  return Response.json(text, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
