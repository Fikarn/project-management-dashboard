import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { generateId } from "@/lib/id";
import { withErrorHandling } from "@/lib/api";
import type { ProjectStatus, Priority, SortOption } from "@/lib/types";

const STATUS_CYCLE: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];
const PRIORITY_CYCLE: Priority[] = ["p0", "p1", "p2", "p3"];
const SORT_CYCLE: SortOption[] = ["manual", "priority", "date", "name"];
const VALID_STATUSES = new Set(STATUS_CYCLE);
const VALID_PRIORITIES = new Set(PRIORITY_CYCLE);

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const action: string = body.action;

  if (!action) {
    return Response.json({ error: "action is required" }, { status: 400, headers: getCorsHeaders(req) });
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
        const next = idx === -1 ? 0 : (idx + dir + db.projects.length) % db.projects.length;
        const newProjectId = db.projects[next].id;
        const projectTasks = db.tasks.filter((t) => t.projectId === newProjectId).sort((a, b) => a.order - b.order);
        const firstTaskId = projectTasks.length > 0 ? projectTasks[0].id : null;
        return { ...db, settings: { ...db.settings, selectedProjectId: newProjectId, selectedTaskId: firstTaskId } };
      });
      eventEmitter.emit("update");
      result = { selectedProjectId: db.settings.selectedProjectId, selectedTaskId: db.settings.selectedTaskId };
      break;
    }

    // ── Task selection ──────────────────────────────────────
    case "selectNextTask":
    case "selectPrevTask": {
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const projectTasks = db.tasks.filter((t) => t.projectId === pid).sort((a, b) => a.order - b.order);
        if (projectTasks.length === 0) return { ...db, settings: { ...db.settings, selectedTaskId: null } };
        const dir = action === "selectNextTask" ? 1 : -1;
        const idx = projectTasks.findIndex((t) => t.id === db.settings.selectedTaskId);
        const next = idx === -1 ? 0 : (idx + dir + projectTasks.length) % projectTasks.length;
        return { ...db, settings: { ...db.settings, selectedTaskId: projectTasks[next].id } };
      });
      eventEmitter.emit("update");
      result = { selectedTaskId: db.settings.selectedTaskId };
      break;
    }

    // ── Project status ─────────────────────────────────────
    case "setStatus": {
      const status = body.value as ProjectStatus;
      if (!status || !VALID_STATUSES.has(status)) {
        return Response.json({ error: "Invalid status value" }, { status: 400, headers: getCorsHeaders(req) });
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

    case "prevStatus": {
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const project = db.projects.find((p) => p.id === pid);
        if (!project) return db;
        const idx = STATUS_CYCLE.indexOf(project.status);
        const next = STATUS_CYCLE[(idx - 1 + STATUS_CYCLE.length) % STATUS_CYCLE.length];
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
        return Response.json({ error: "Invalid priority value" }, { status: 400, headers: getCorsHeaders(req) });
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

    case "prevPriority": {
      const db = await mutateDB((db) => {
        const pid = db.settings.selectedProjectId;
        if (!pid) return db;
        const project = db.projects.find((p) => p.id === pid);
        if (!project) return db;
        const idx = PRIORITY_CYCLE.indexOf(project.priority);
        const next = PRIORITY_CYCLE[(idx - 1 + PRIORITY_CYCLE.length) % PRIORITY_CYCLE.length];
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

    // ── Sort ────────────────────────────────────────────────
    case "nextSort": {
      const db = await mutateDB((db) => {
        const idx = SORT_CYCLE.indexOf(db.settings.sortBy);
        const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
        return { ...db, settings: { ...db.settings, sortBy: next } };
      });
      eventEmitter.emit("update");
      result = { sortBy: db.settings.sortBy };
      break;
    }

    case "prevSort": {
      const db = await mutateDB((db) => {
        const idx = SORT_CYCLE.indexOf(db.settings.sortBy);
        const next = SORT_CYCLE[(idx - 1 + SORT_CYCLE.length) % SORT_CYCLE.length];
        return { ...db, settings: { ...db.settings, sortBy: next } };
      });
      eventEmitter.emit("update");
      result = { sortBy: db.settings.sortBy };
      break;
    }

    case "resetSort": {
      await mutateDB((db) => ({
        ...db,
        settings: { ...db.settings, sortBy: "manual" as SortOption },
      }));
      eventEmitter.emit("update");
      result = { sortBy: "manual" };
      break;
    }

    // ── Timer ──────────────────────────────────────────────
    case "toggleTimer": {
      const db = readDB();
      const pid = db.settings.selectedProjectId;
      if (!pid) {
        return Response.json({ error: "No project selected" }, { status: 400, headers: getCorsHeaders(req) });
      }
      const projectTasks = db.tasks.filter((t) => t.projectId === pid).sort((a, b) => a.order - b.order);

      // Target selectedTaskId if set, otherwise fall back to first running / first task
      let targetTask = db.settings.selectedTaskId
        ? projectTasks.find((t) => t.id === db.settings.selectedTaskId)
        : undefined;
      if (!targetTask) {
        const runningTask = projectTasks.find((t) => t.isRunning);
        targetTask = runningTask ?? projectTasks[0];
      }
      if (!targetTask) {
        return Response.json({ error: "No tasks in selected project" }, { status: 400, headers: getCorsHeaders(req) });
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
              const elapsed = t.lastStarted ? Math.floor((Date.now() - new Date(t.lastStarted).getTime()) / 1000) : 0;
              return { ...t, isRunning: false, totalSeconds: t.totalSeconds + elapsed, lastStarted: null };
            }
          }),
        };
        return logActivity(
          updated,
          "task",
          targetTask.id,
          `timer_${newAction}ed`,
          `Timer ${newAction}ed via Stream Deck`
        );
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
        return Response.json({ error: "No project selected" }, { status: 400, headers: getCorsHeaders(req) });
      }
      const projectTasks = db.tasks.filter((t) => t.projectId === pid).sort((a, b) => a.order - b.order);

      // Target selectedTaskId if set, otherwise fall back to first incomplete / last completed
      let targetTask = db.settings.selectedTaskId
        ? projectTasks.find((t) => t.id === db.settings.selectedTaskId)
        : undefined;
      if (!targetTask) {
        const incomplete = projectTasks.find((t) => !t.completed);
        targetTask = incomplete ?? projectTasks[projectTasks.length - 1];
      }
      if (!targetTask) {
        return Response.json({ error: "No tasks in selected project" }, { status: 400, headers: getCorsHeaders(req) });
      }

      const db2 = await mutateDB((db) => {
        const updated = {
          ...db,
          tasks: db.tasks.map((t) => (t.id === targetTask.id ? { ...t, completed: !t.completed } : t)),
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
          settings: { ...db.settings, selectedProjectId: id, selectedTaskId: null },
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
        return Response.json({ error: "No project selected" }, { status: 400, headers: getCorsHeaders(req) });
      }
      const project = db.projects.find((p) => p.id === pid);
      const db2 = await mutateDB((db) => {
        const updated = {
          ...db,
          projects: db.projects.filter((p) => p.id !== pid),
          tasks: db.tasks.filter((t) => t.projectId !== pid),
          settings: { ...db.settings, selectedProjectId: null, selectedTaskId: null },
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
        return Response.json({ error: "Invalid filter value" }, { status: 400, headers: getCorsHeaders(req) });
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
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: getCorsHeaders(req) });
  }

  return Response.json(result, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
