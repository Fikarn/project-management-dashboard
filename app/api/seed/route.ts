import { readDB, writeDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import { buildSeedData } from "@/lib/seed-data";

export const POST = withErrorHandling(async (req) => {
  const db = readDB();

  // Safety guard: only seed when empty
  if (db.projects.length > 0) {
    return Response.json({ error: "Database already has projects" }, { status: 400, headers: getCorsHeaders(req) });
  }

  // Check if lights should be preserved (e.g. when seeding from setup wizard after configuring lights)
  let preserveLights = false;
  try {
    const body = await req.json();
    preserveLights = body?.preserveLights === true;
  } catch {
    // No body or invalid JSON — use defaults
  }

  const seedData = buildSeedData();

  if (preserveLights) {
    seedData.lights = db.lights;
    seedData.lightGroups = db.lightGroups;
    seedData.lightScenes = db.lightScenes;
    seedData.lightingSettings = db.lightingSettings;
  }

  writeDB(seedData);
  eventEmitter.emit("update");

  return Response.json({ ok: true, projects: seedData.projects.length }, { headers: getCorsHeaders(req) });
});

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: getCorsHeaders(req) });
}
