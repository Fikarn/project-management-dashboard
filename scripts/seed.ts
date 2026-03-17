import fs from "fs";
import path from "path";
import type { DB } from "../lib/types";

const db: DB = {
  projects: [
    {
      id: "proj-1",
      title: "Website Redesign",
      status: "in-progress",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "proj-2",
      title: "API Integration",
      status: "todo",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "proj-3",
      title: "Database Migration",
      status: "blocked",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "proj-4",
      title: "Auth Refactor",
      status: "done",
      lastUpdated: new Date().toISOString(),
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "proj-1",
      title: "Design mockups",
      isRunning: false,
      totalSeconds: 3600,
      lastStarted: null,
    },
    {
      id: "task-2",
      projectId: "proj-1",
      title: "Implement components",
      isRunning: false,
      totalSeconds: 0,
      lastStarted: null,
    },
    {
      id: "task-3",
      projectId: "proj-2",
      title: "Research endpoints",
      isRunning: false,
      totalSeconds: 1800,
      lastStarted: null,
    },
    {
      id: "task-4",
      projectId: "proj-3",
      title: "Write migration scripts",
      isRunning: false,
      totalSeconds: 900,
      lastStarted: null,
    },
    {
      id: "task-5",
      projectId: "proj-4",
      title: "Update JWT handling",
      isRunning: false,
      totalSeconds: 7200,
      lastStarted: null,
    },
  ],
};

const dbPath = path.join(process.cwd(), "data", "db.json");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log("Seeded data/db.json");
