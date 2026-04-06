import fs from "fs";
import path from "path";
import { buildSeedData } from "../lib/seed-data";

const db = buildSeedData({ includeLights: true });

const dbPath = path.join(process.cwd(), "data", "db.json");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log("Seeded data/db.json");
