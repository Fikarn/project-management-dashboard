import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import { supportsRgb } from "@/lib/light-types";

export const dynamic = "force-dynamic";

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

function getLightLcdText(key: string): string {
  const db = readDB();
  const { selectedLightId, selectedSceneId } = db.lightingSettings;
  const lights = [...db.lights].sort((a, b) => a.order - b.order);
  const scenes = [...db.lightScenes].sort((a, b) => a.order - b.order);

  const selectedLight = lights.find((l) => l.id === selectedLightId) ?? null;
  const lightIndex = selectedLight ? lights.findIndex((l) => l.id === selectedLight.id) : -1;

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) ?? null;
  const sceneIndex = selectedScene ? scenes.findIndex((s) => s.id === selectedScene.id) : -1;

  switch (key) {
    case "light_nav": {
      if (!selectedLight) return "LIGHT\\n(none)\\n--";
      const name = truncate(selectedLight.name, 12);
      return `LIGHT\\n${name}\\n${lightIndex + 1}/${lights.length}`;
    }
    case "light_intensity": {
      if (!selectedLight) return "INTENSITY\\n--";
      return `INTENSITY\\n${selectedLight.intensity}%`;
    }
    case "light_cct": {
      if (!selectedLight) return "CCT\\n--";
      return `CCT\\n${selectedLight.cct}K`;
    }
    case "scene_nav": {
      if (!selectedScene) return "SCENE\\n(none)\\n--";
      const name = truncate(selectedScene.name, 12);
      return `SCENE\\n${name}\\n${sceneIndex + 1}/${scenes.length}`;
    }
    // Stream Deck+ dial LCD keys
    case "dial_1": {
      if (!selectedLight) return "INTENSITY\\n--";
      return `INTENSITY\\n${selectedLight.intensity}%`;
    }
    case "dial_2": {
      if (!selectedLight) return "CCT\\n--";
      return `CCT\\n${selectedLight.cct}K`;
    }
    case "dial_3": {
      if (!selectedLight) return "RED\\n--";
      if (!supportsRgb(selectedLight.type)) return "RED\\n---";
      return `RED\\n${selectedLight.red}`;
    }
    case "dial_4": {
      if (!selectedLight) return "GREEN\\n--";
      if (!supportsRgb(selectedLight.type)) return "GREEN\\n---";
      return `GREEN\\n${selectedLight.green}`;
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

  const text = getLightLcdText(key);
  return Response.json(text, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
