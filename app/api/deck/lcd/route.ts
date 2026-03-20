import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import type { ProjectStatus, Priority, SortOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  p0: "P0 Critical",
  p1: "P1 High",
  p2: "P2 Medium",
  p3: "P3 Low",
};

const SORT_LABEL: Record<SortOption, string> = {
  manual: "Manual",
  priority: "Priority",
  date: "Date",
  name: "Name",
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

function getLcdText(key: string): string {
  const db = readDB();
  const { selectedProjectId, selectedTaskId, sortBy } = db.settings;

  const project = db.projects.find((p) => p.id === selectedProjectId) ?? null;
  const projectIndex = project ? db.projects.findIndex((p) => p.id === project.id) : -1;

  const projectTasks = project
    ? db.tasks.filter((t) => t.projectId === project.id).sort((a, b) => a.order - b.order)
    : [];

  const selectedTask = selectedTaskId ? (projectTasks.find((t) => t.id === selectedTaskId) ?? null) : null;
  const taskIndex = selectedTask ? projectTasks.findIndex((t) => t.id === selectedTask.id) : -1;

  switch (key) {
    case "project_nav": {
      if (!project) return "PROJECT\\n(none)\\n--";
      const title = truncate(project.title, 12);
      return `PROJECT\\n${title}\\n${projectIndex + 1}/${db.projects.length}`;
    }
    case "project_status": {
      if (!project) return "STATUS\\n--";
      return `STATUS\\n${STATUS_LABEL[project.status]}`;
    }
    case "project_priority": {
      if (!project) return "PRIORITY\\n--";
      return `PRIORITY\\n${PRIORITY_LABEL[project.priority]}`;
    }
    case "sort_mode": {
      return `SORT\\n${SORT_LABEL[sortBy]}`;
    }
    case "task_nav": {
      if (!selectedTask) return "TASK\\n(none)\\n--";
      const title = truncate(selectedTask.title, 12);
      return `TASK\\n${title}\\n${taskIndex + 1}/${projectTasks.length}`;
    }
    // ── Light mode LCD keys ──────────────────────────────
    case "light_nav": {
      const lights = [...db.lights].sort((a, b) => a.order - b.order);
      const sel = lights.find((l) => l.id === db.lightingSettings.selectedLightId) ?? null;
      if (!sel) return "LIGHT\\n(none)\\n--";
      const idx = lights.findIndex((l) => l.id === sel.id);
      const name = truncate(sel.name, 12);
      return `LIGHT\\n${name}\\n${idx + 1}/${lights.length}`;
    }
    case "light_intensity": {
      const light = db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) ?? null;
      if (!light) return "INTENSITY\\n--";
      return `INTENSITY\\n${light.intensity}%`;
    }
    case "light_cct": {
      const light = db.lights.find((l) => l.id === db.lightingSettings.selectedLightId) ?? null;
      if (!light) return "CCT\\n--";
      return `CCT\\n${light.cct}K`;
    }
    case "scene_nav": {
      const scenes = [...db.lightScenes].sort((a, b) => a.order - b.order);
      const sel = scenes.find((s) => s.id === db.lightingSettings.selectedSceneId) ?? null;
      if (!sel) return "SCENE\\n(none)\\n--";
      const idx = scenes.findIndex((s) => s.id === sel.id);
      const name = truncate(sel.name, 12);
      return `SCENE\\n${name}\\n${idx + 1}/${scenes.length}`;
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

  const text = getLcdText(key);
  return Response.json(text, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
