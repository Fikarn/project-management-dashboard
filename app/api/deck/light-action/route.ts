import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { generateId } from "@/lib/id";
import { sendDmxFrame } from "@/lib/dmx";
import { withErrorHandling } from "@/lib/api";
import { getCctRange, getConfig } from "@/lib/light-types";
import type { DeckMode } from "@/lib/types";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const action: string = body.action;

  if (!action) {
    return Response.json({ error: "action is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  let result: Record<string, unknown> = {};

  switch (action) {
    // ── Light selection ──────────────────────────────────
    case "selectNextLight":
    case "selectPrevLight": {
      const db = await mutateDB((db) => {
        if (db.lights.length === 0) return db;
        const sorted = [...db.lights].sort((a, b) => a.order - b.order);
        const dir = action === "selectNextLight" ? 1 : -1;
        const idx = sorted.findIndex((l) => l.id === db.lightingSettings.selectedLightId);
        const next = idx === -1 ? 0 : (idx + dir + sorted.length) % sorted.length;
        return {
          ...db,
          lightingSettings: { ...db.lightingSettings, selectedLightId: sorted[next].id },
        };
      });
      eventEmitter.emit("update");
      result = { selectedLightId: db.lightingSettings.selectedLightId };
      break;
    }

    // ── Intensity ────────────────────────────────────────
    case "intensityUp":
    case "intensityDown": {
      const delta = action === "intensityUp" ? 5 : -5;
      const db = await mutateDB((db) => {
        const lid = db.lightingSettings.selectedLightId;
        if (!lid) return db;
        return {
          ...db,
          lights: db.lights.map((l) =>
            l.id === lid ? { ...l, intensity: Math.max(0, Math.min(100, l.intensity + delta)) } : l
          ),
        };
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { light: db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) };
      break;
    }

    // ── CCT ──────────────────────────────────────────────
    case "cctUp":
    case "cctDown": {
      const delta = action === "cctUp" ? 200 : -200;
      const db = await mutateDB((db) => {
        const lid = db.lightingSettings.selectedLightId;
        if (!lid) return db;
        return {
          ...db,
          lights: db.lights.map((l) => {
            if (l.id !== lid) return l;
            const [cctMin, cctMax] = getCctRange(l.type);
            return { ...l, cct: Math.max(cctMin, Math.min(cctMax, l.cct + delta)) };
          }),
        };
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { light: db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) };
      break;
    }

    // ── Toggle light ─────────────────────────────────────
    case "toggleLight": {
      const db = await mutateDB((db) => {
        const lid = db.lightingSettings.selectedLightId;
        if (!lid) return db;
        return {
          ...db,
          lights: db.lights.map((l) => (l.id === lid ? { ...l, on: !l.on } : l)),
        };
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { light: db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) };
      break;
    }

    // ── All on/off ───────────────────────────────────────
    case "allOn":
    case "allOff": {
      const on = action === "allOn";
      const db = await mutateDB((db) => {
        const updated = {
          ...db,
          lights: db.lights.map((l) => ({ ...l, on })),
        };
        return logActivity(
          updated,
          "light",
          "all",
          on ? "all_on" : "all_off",
          `All lights turned ${on ? "on" : "off"} via Stream Deck`
        );
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { on };
      break;
    }

    // ── Intensity/CCT reset (dial press) ─────────────────
    case "resetIntensity": {
      const db = await mutateDB((db) => {
        const lid = db.lightingSettings.selectedLightId;
        if (!lid) return db;
        return {
          ...db,
          lights: db.lights.map((l) => (l.id === lid ? { ...l, intensity: 100 } : l)),
        };
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { light: db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) };
      break;
    }

    case "resetCct": {
      const db = await mutateDB((db) => {
        const lid = db.lightingSettings.selectedLightId;
        if (!lid) return db;
        return {
          ...db,
          lights: db.lights.map((l) => (l.id === lid ? { ...l, cct: getConfig(l.type).defaultCct } : l)),
        };
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { light: db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) };
      break;
    }

    // ── Scene selection ──────────────────────────────────
    case "selectNextScene":
    case "selectPrevScene": {
      const db = await mutateDB((db) => {
        if (db.lightScenes.length === 0) return db;
        const sorted = [...db.lightScenes].sort((a, b) => a.order - b.order);
        const dir = action === "selectNextScene" ? 1 : -1;
        const idx = sorted.findIndex((s) => s.id === db.lightingSettings.selectedSceneId);
        const next = idx === -1 ? 0 : (idx + dir + sorted.length) % sorted.length;
        return {
          ...db,
          lightingSettings: { ...db.lightingSettings, selectedSceneId: sorted[next].id },
        };
      });
      eventEmitter.emit("update");
      result = { selectedSceneId: db.lightingSettings.selectedSceneId };
      break;
    }

    // ── Recall scene ─────────────────────────────────────
    case "recallScene": {
      const db0 = readDB();
      const sid = db0.lightingSettings.selectedSceneId;
      if (!sid) {
        return Response.json({ error: "No scene selected" }, { status: 400, headers: getCorsHeaders(req) });
      }
      const scene = db0.lightScenes.find((s) => s.id === sid);
      if (!scene) {
        return Response.json({ error: "Scene not found" }, { status: 404, headers: getCorsHeaders(req) });
      }
      const db = await mutateDB((db) => {
        const updated = {
          ...db,
          lights: db.lights.map((l) => {
            const state = scene.lightStates.find((ls) => ls.lightId === l.id);
            if (!state) return l;
            return {
              ...l,
              intensity: state.intensity,
              cct: state.cct,
              on: state.on,
              red: state.red,
              green: state.green,
              blue: state.blue,
              colorMode: state.colorMode,
              gmTint: state.gmTint,
            };
          }),
        };
        return logActivity(updated, "scene", sid, "recalled", `Scene "${scene.name}" recalled via Stream Deck`);
      });
      await sendDmxFrame(db.lights, db.lightingSettings);
      eventEmitter.emit("update");
      result = { recalled: scene.name };
      break;
    }

    // ── Save scene ───────────────────────────────────────
    case "saveScene": {
      const id = generateId("scene");
      const db = await mutateDB((db) => {
        const sceneNum = db.lightScenes.length + 1;
        const scene = {
          id,
          name: `Scene ${sceneNum}`,
          lightStates: db.lights.map((l) => ({
            lightId: l.id,
            intensity: l.intensity,
            cct: l.cct,
            on: l.on,
            red: l.red,
            green: l.green,
            blue: l.blue,
            colorMode: l.colorMode,
            gmTint: l.gmTint,
          })),
          createdAt: new Date().toISOString(),
          order: db.lightScenes.length,
        };
        const updated = {
          ...db,
          lightScenes: [...db.lightScenes, scene],
          lightingSettings: { ...db.lightingSettings, selectedSceneId: id },
        };
        return logActivity(updated, "scene", id, "created", `Scene "${scene.name}" saved via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { scene: db.lightScenes.find((s) => s.id === id) };
      break;
    }

    // ── Delete scene ─────────────────────────────────────
    case "deleteScene": {
      const db0 = readDB();
      const sid = db0.lightingSettings.selectedSceneId;
      if (!sid) {
        return Response.json({ error: "No scene selected" }, { status: 400, headers: getCorsHeaders(req) });
      }
      const scene = db0.lightScenes.find((s) => s.id === sid);
      if (!scene) {
        return Response.json({ error: "Scene not found" }, { status: 404, headers: getCorsHeaders(req) });
      }
      await mutateDB((db) => {
        const updated = {
          ...db,
          lightScenes: db.lightScenes.filter((s) => s.id !== sid),
          lightingSettings: { ...db.lightingSettings, selectedSceneId: null },
        };
        return logActivity(updated, "scene", sid, "deleted", `Scene "${scene.name}" deleted via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { deleted: true };
      break;
    }

    // ── Mode switch ──────────────────────────────────────
    case "switchToDeckMode": {
      const mode: DeckMode = body.value === "project" ? "project" : "light";
      await mutateDB((db) => ({
        ...db,
        settings: { ...db.settings, deckMode: mode },
      }));
      eventEmitter.emit("update");
      result = { deckMode: mode };
      break;
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: getCorsHeaders(req) });
  }

  return Response.json(result, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
