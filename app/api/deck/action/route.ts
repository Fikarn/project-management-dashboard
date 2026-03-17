import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { generateId } from "@/lib/id";
import type { ProjectStatus, Priority } from "@/lib/types";

const STATUS_CYCLE: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];
const PRIORITY_CYCLE: Priority[] = ["p0", "p1", "p2", "p3"];
const VALID_STATUSES = new Set(STATUS_CYCLE);
const VALID_PRIORITIES = new Set(PRIORITY_CYCLE);

export async function POST(req: Request) {
  const body = await req.json();
  const action: string = body.action;

  if (!action) {
    return Response.json({ error: "action is required" }, { status: 400, headers: corsHeaders });
  }

  let result: Record<string, unknown> = {};

  switch (action) {
    // ── Project selection ──────────────────────────────────
    case "selectNextProject":
    case "selectPrevProject": {
      const db = await mutateDB((db) => {
        if (db.projects.length === 0) return db;
        const dir = action === "selectNextProject" ? 1 : -1;
        const idx = db.projects.findIndex((p) => p.id === db.settings.selectedProjectId);
        const next = (idx === -1 ? 0 : (idx + dir + db.projects.length) % db.projects.length);
        return { ...db, settings: { ...db.settings, selectedProjectId: db.projects[next].id } };
      });
      eventEmitter.emit("update");
      result = { selectedProjectId: db.settings.selectedProjectId };
      break;
    }

    case "selectNextTask":
    case "selectPrevTask": {
      // This is informational — we track task selection in the response
      // The UI highlights accordingly
      const db = readDB();
      const projectTasks = db.tasks
        .filter((t) => t.projectId === db.settings.selectedProjectId)
        .sort((a, b) => a.order - b.order);
      result = { tasks: projectTasks.map((t) => t.id) };
      break;
    }

    // ── Project status ─────────────────────────────────────
    case "setStatus": {
      const status = body.value as ProjectStatus;
      if (!status || !VALID_STATUSES.has(status)) {
        return Response.json({ error: "Invalid status value" }, { status: 400, headers: corsHeaders });
      }
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const project = db.projects.find((p) => p.id === pid);
        if (!project) return db;
        const updated = {
          ...db,
          projects: db.projects.map((p) =>
            p.id === pid ? { ...p, status, lastUpdated: new Date().toISOString() } : p
          ),
        };
        return logActivity(updated, "project", pid, "status_changed", `Status set to ${status} via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { project: db.projects.find((p) => p.id === db.settings.selectedProjectId) };
      break;
    }

    case "nextStatus": {
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const project = db.projects.find((p) => p.id === pid);
        if (!project) return db;
        const idx = STATUS_CYCLE.indexOf(project.status);
        const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        const updated = {
          ...db,
          projects: db.projects.map((p) =>
            p.id === pid ? { ...p, status: next, lastUpdated: new Date().toISOString() } : p
          ),
        };
        return logActivity(updated, "project", pid, "status_changed", `Status cycled to ${next} via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { project: db.projects.find((p) => p.id === db.settings.selectedProjectId) };
      break;
    }

    // ── Priority ───────────────────────────────────────────
    case "setPriority": {
      const priority = body.value as Priority;
      if (!priority || !VALID_PRIORITIES.has(priority)) {
        return Response.json({ error: "Invalid priority value" }, { status: 400, headers: corsHeaders });
      }
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const updated = {
          ...db,
          projects: db.projects.map((p) =>
            p.id === pid ? { ...p, priority, lastUpdated: new Date().toISOString() } : p
          ),
        };
        return logActivity(updated, "project", pid, "updated", `Priority set to ${priority} via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { project: db.projects.find((p) => p.id === db.settings.selectedProjectId) };
      break;
    }

    case "nextPriority": {
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const project = db.projects.find((p) => p.id === pid);
        if (!project) return db;
        const idx = PRIORITY_CYCLE.indexOf(project.priority);
        const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
        const updated = {
          ...db,
          projects: db.projects.map((p) =>
            p.id === pid ? { ...p, priority: next, lastUpdated: new Date().toISOString() } : p
          ),
        };
        return logActivity(updated, "project", pid, "updated", `Priority cycled to ${next} via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { project: db.projects.find((p) => p.id === db.settings.selectedProjectId) };
      break;
    }

    // ── Timer ──────────────────────────────────────────────
    case "toggleTimer": {
      const db = readDB();
      const pid = db.settings.selectedProjectId;
      if (!pid) {
        return Response.json({ error: "No project selected" }, { status: 400, headers: corsHeaders });
      }
      const projectTasks = db.tasks
        .filter((t) => t.projectId === pid)
        .sort((a, b) => a.order - b.order);
      // Toggle the first running task, or start the first task
      const runningTask = projectTasks.find((t) => t.isRunning);
      const targetTask = runningTask ?? projectTasks[0];
      if (!targetTask) {
        return Response.json({ error: "No tasks in selected project" }, { status: 400, headers: corsHeaders });
      }

      const newAction = targetTask.isRunning ? "stop" : "start";
      const db2 = await mutateDB((db) => {
        const updated = {
          ...db,
          tasks: db.tasks.map((t) => {
            if (t.id !== targetTask.id) return t;
            if (newAction === "start") {
              return { ...t, isRunning: true, lastStarted: new Date().toISOString() };
            } else {
              const elapsed = t.lastStarted
                ? Math.floor((Date.now() - new Date(t.lastStarted).getTime()) / 1000)
                : 0;
              return { ...t, isRunning: false, totalSeconds: t.totalSeconds + elapsed, lastStarted: null };
            }
          }),
        };
        return logActivity(updated, "task", targetTask.id, `timer_${newAction}ed`, `Timer ${newAction}ed via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { task: db2.tasks.find((t) => t.id === targetTask.id) };
      break;
    }

    // ── Task complete ──────────────────────────────────────
    case "toggleTaskComplete": {
      const db = readDB();
      const pid = db.settings.selectedProjectId;
      if (!pid) {
        return Response.json({ error: "No project selected" }, { status: 400, headers: corsHeaders });
      }
      const projectTasks = db.tasks
        .filter((t) => t.projectId === pid)
        .sort((a, b) => a.order - b.order);
      // Toggle the first incomplete task, or uncomplete the last completed
      const incomplete = projectTasks.find((t) => !t.completed);
      const targetTask = incomplete ?? projectTasks[projectTasks.length - 1];
      if (!targetTask) {
        return Response.json({ error: "No tasks in selected project" }, { status: 400, headers: corsHeaders });
      }

      const db2 = await mutateDB((db) => {
        const updated = {
          ...db,
          tasks: db.tasks.map((t) =>
            t.id === targetTask.id ? { ...t, completed: !t.completed } : t
          ),
        };
        const label = !targetTask.completed ? "completed" : "uncompleted";
        return logActivity(updated, "task", targetTask.id, label, `Task ${label} via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { task: db2.tasks.find((t) => t.id === targetTask.id) };
      break;
    }

    // ── Create / delete ────────────────────────────────────
    case "createProject": {
      const title = body.value ?? "New Project";
      const id = generateId("proj");
      const now = new Date().toISOString();
      const db = await mutateDB((db) => {
        const project = {
          id,
          title,
          description: "",
          status: "todo" as ProjectStatus,
          priority: "p2" as Priority,
          createdAt: now,
          lastUpdated: now,
          order: db.projects.length,
        };
        const updated = {
          ...db,
          projects: [...db.projects, project],
          settings: { ...db.settings, selectedProjectId: id },
        };
        return logActivity(updated, "project", id, "created", `Project "${title}" created via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { project: db.projects.find((p) => p.id === id) };
      break;
    }

    case "deleteProject": {
      const db = readDB();
      const pid = db.settings.selectedProjectId;
      if (!pid) {
        return Response.json({ error: "No project selected" }, { status: 400, headers: corsHeaders });
      }
      const project = db.projects.find((p) => p.id === pid);
      const db2 = await mutateDB((db) => {
        const updated = {
          ...db,
          projects: db.projects.filter((p) => p.id !== pid),
          tasks: db.tasks.filter((t) => t.projectId !== pid),
          settings: { ...db.settings, selectedProjectId: null },
        };
        return logActivity(updated, "project", pid, "deleted", `Project "${project?.title}" deleted via Stream Deck`);
      });
      eventEmitter.emit("update");
      result = { deleted: true, projectId: pid };
      break;
    }

    // ── View filter ────────────────────────────────────────
    case "setFilter": {
      const filter = body.value;
      const validFilters = ["all", "todo", "in-progress", "blocked", "done"];
      if (!validFilters.includes(filter)) {
        return Response.json({ error: "Invalid filter value" }, { status: 400, headers: corsHeaders });
      }
      await mutateDB((db) => ({
        ...db,
        settings: { ...db.settings, viewFilter: filter },
      }));
      eventEmitter.emit("update");
      result = { viewFilter: filter };
      break;
    }

    // ── Open detail (triggers UI event) ────────────────────
    case "openDetail": {
      eventEmitter.emit("update");
      result = { action: "openDetail" };
      break;
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: corsHeaders });
  }

  return Response.json(result, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
