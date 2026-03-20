import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

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
    default:
      return "--";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return Response.json({ error: "Missing ?key= parameter" }, { status: 400, headers: corsHeaders });
  }

  const text = getLightLcdText(key);
  return Response.json(text, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
