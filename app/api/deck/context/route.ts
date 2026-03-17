import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const { selectedProjectId } = db.settings;

  const project = db.projects.find((p) => p.id === selectedProjectId) ?? null;
  const projectTasks = project
    ? db.tasks.filter((t) => t.projectId === project.id).sort((a, b) => a.order - b.order)
    : [];

  const runningTask = db.tasks.find((t) => t.isRunning) ?? null;

  const projectIndex = project ? db.projects.findIndex((p) => p.id === project.id) : -1;

  return Response.json(
    {
      selectedProject: project
        ? {
            id: project.id,
            title: project.title,
            status: project.status,
            priority: project.priority,
          }
        : null,
      projectIndex,
      projectCount: db.projects.length,
      tasks: projectTasks.map((t) => ({
        id: t.id,
        title: t.title,
        isRunning: t.isRunning,
        completed: t.completed,
        totalSeconds: t.totalSeconds,
        priority: t.priority,
      })),
      taskCount: projectTasks.length,
      runningTask: runningTask
        ? {
            id: runningTask.id,
            projectId: runningTask.projectId,
            title: runningTask.title,
            totalSeconds: runningTask.totalSeconds,
            lastStarted: runningTask.lastStarted,
          }
        : null,
      viewFilter: db.settings.viewFilter,
      sortBy: db.settings.sortBy,
    },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
