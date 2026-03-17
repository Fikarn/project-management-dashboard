import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const db = readDB();

  const filteredTasks = projectId
    ? db.tasks.filter((t) => t.projectId === projectId)
    : db.tasks;

  // Per-project time breakdown
  const projectMap = new Map<string, { title: string; totalSeconds: number; taskCount: number }>();

  for (const task of filteredTasks) {
    const project = db.projects.find((p) => p.id === task.projectId);
    if (!project) continue;

    const existing = projectMap.get(task.projectId) ?? {
      title: project.title,
      totalSeconds: 0,
      taskCount: 0,
    };
    existing.totalSeconds += task.totalSeconds;
    existing.taskCount += 1;
    projectMap.set(task.projectId, existing);
  }

  const byProject = Array.from(projectMap.entries())
    .map(([id, data]) => ({ projectId: id, ...data }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  // Per-task breakdown (top tasks by time)
  const byTask = filteredTasks
    .filter((t) => t.totalSeconds > 0)
    .map((t) => {
      const project = db.projects.find((p) => p.id === t.projectId);
      return {
        taskId: t.id,
        taskTitle: t.title,
        projectId: t.projectId,
        projectTitle: project?.title ?? "Unknown",
        totalSeconds: t.totalSeconds,
        isRunning: t.isRunning,
        lastStarted: t.lastStarted,
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  // Timer events from activity log (for timeline data)
  const timerEvents = db.activityLog
    .filter((a) => a.action === "timer_started" || a.action === "timer_stopped")
    .slice(0, 100);

  const totalSeconds = filteredTasks.reduce((sum, t) => sum + t.totalSeconds, 0);

  return Response.json(
    {
      totalSeconds,
      byProject,
      byTask,
      timerEvents,
    },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
