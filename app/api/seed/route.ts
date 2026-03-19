import { readDB, writeDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import type { DB } from "@/lib/types";

function buildSeedData(): DB {
  const now = new Date().toISOString();
  return {
    projects: [
      {
        id: "proj-1",
        title: "Website Redesign",
        description:
          "Complete overhaul of the marketing site with new branding.",
        status: "in-progress",
        priority: "p1",
        createdAt: now,
        lastUpdated: now,
        order: 0,
      },
      {
        id: "proj-2",
        title: "API Integration",
        description:
          "Integrate third-party payment and analytics APIs.",
        status: "todo",
        priority: "p2",
        createdAt: now,
        lastUpdated: now,
        order: 1,
      },
      {
        id: "proj-3",
        title: "Database Migration",
        description:
          "Migrate from legacy schema to normalized structure.",
        status: "blocked",
        priority: "p0",
        createdAt: now,
        lastUpdated: now,
        order: 2,
      },
      {
        id: "proj-4",
        title: "Auth Refactor",
        description: "Replace session-based auth with JWT tokens.",
        status: "done",
        priority: "p3",
        createdAt: now,
        lastUpdated: now,
        order: 3,
      },
    ],
    tasks: [
      {
        id: "task-1",
        projectId: "proj-1",
        title: "Design mockups",
        description: "Create Figma mockups for all key pages.",
        priority: "p1",
        dueDate: null,
        labels: ["design"],
        checklist: [
          { id: "cl-1", text: "Homepage layout", done: true },
          { id: "cl-2", text: "About page", done: true },
          { id: "cl-3", text: "Contact form", done: false },
        ],
        isRunning: false,
        totalSeconds: 3600,
        lastStarted: null,
        completed: true,
        order: 0,
        createdAt: now,
      },
      {
        id: "task-2",
        projectId: "proj-1",
        title: "Implement components",
        description: "Build React components from approved mockups.",
        priority: "p1",
        dueDate: "2026-03-25",
        labels: ["frontend"],
        checklist: [],
        isRunning: false,
        totalSeconds: 0,
        lastStarted: null,
        completed: false,
        order: 1,
        createdAt: now,
      },
      {
        id: "task-3",
        projectId: "proj-2",
        title: "Research endpoints",
        description:
          "Document available API endpoints and rate limits.",
        priority: "p2",
        dueDate: "2026-03-20",
        labels: ["research"],
        checklist: [],
        isRunning: false,
        totalSeconds: 1800,
        lastStarted: null,
        completed: false,
        order: 0,
        createdAt: now,
      },
      {
        id: "task-4",
        projectId: "proj-3",
        title: "Write migration scripts",
        description: "SQL migration scripts for schema changes.",
        priority: "p0",
        dueDate: null,
        labels: ["backend", "database"],
        checklist: [],
        isRunning: false,
        totalSeconds: 900,
        lastStarted: null,
        completed: false,
        order: 0,
        createdAt: now,
      },
      {
        id: "task-5",
        projectId: "proj-4",
        title: "Update JWT handling",
        description: "Implement token refresh and revocation.",
        priority: "p2",
        dueDate: null,
        labels: ["auth"],
        checklist: [],
        isRunning: false,
        totalSeconds: 7200,
        lastStarted: null,
        completed: true,
        order: 0,
        createdAt: now,
      },
    ],
    activityLog: [
      {
        id: "act-seed-1",
        timestamp: now,
        entityType: "project",
        entityId: "proj-1",
        action: "status_changed",
        detail: "Status set to in-progress",
      },
      {
        id: "act-seed-2",
        timestamp: now,
        entityType: "task",
        entityId: "task-1",
        action: "completed",
        detail: "Task marked as completed",
      },
    ],
    settings: {
      viewFilter: "all",
      sortBy: "manual",
      selectedProjectId: null,
    },
  };
}

export async function POST() {
  const db = readDB();

  // Safety guard: only seed when empty
  if (db.projects.length > 0) {
    return Response.json(
      { error: "Database already has projects" },
      { status: 400, headers: corsHeaders }
    );
  }

  const seedData = buildSeedData();
  writeDB(seedData);
  eventEmitter.emit("update");

  return Response.json(
    { ok: true, projects: seedData.projects.length },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}
