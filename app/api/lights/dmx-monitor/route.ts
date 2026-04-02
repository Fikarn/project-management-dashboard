import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import { computeChannelData } from "@/lib/dmx";
import { getChannelCount } from "@/lib/light-types";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  const channelData = computeChannelData(db.lights, db.lightingSettings);

  // Build channel → light name mapping
  const channelMap: { channel: number; value: number; lightName: string; label: string }[] = [];

  for (const light of db.lights) {
    const count = getChannelCount(light.type);
    const labels = getChannelLabels(light.type);

    for (let i = 0; i < count; i++) {
      const ch = light.dmxStartAddress + i;
      channelMap.push({
        channel: ch,
        value: channelData[ch] ?? 0,
        lightName: light.name,
        label: labels[i] ?? `Ch${i + 1}`,
      });
    }
  }

  // Sort by channel number
  channelMap.sort((a, b) => a.channel - b.channel);

  return Response.json({ channels: channelMap }, { headers: getCorsHeaders(req) });
});

function getChannelLabels(type: string): string[] {
  switch (type) {
    case "astra-bicolor":
      return ["Dimmer", "CCT"];
    case "infinimat":
      return ["Dimmer", "CCT", "±G/M", "Strobe"];
    case "infinibar-pb12":
      return ["Dimmer", "CCT", "Mix", "Red", "Green", "Blue", "FX", "Speed"];
    default:
      return [];
  }
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
