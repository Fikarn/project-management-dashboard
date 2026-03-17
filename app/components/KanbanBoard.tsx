import type { Project, Task, ProjectStatus, ViewFilter } from "@/lib/types";
import KanbanColumn from "./KanbanColumn";

interface KanbanBoardProps {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
}

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in-progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

export default function KanbanBoard({ projects, tasks, filter }: KanbanBoardProps) {
  const visibleColumns =
    filter === "all" ? COLUMNS : COLUMNS.filter((c) => c.status === filter);

  return (
    <div className={`grid gap-6 h-full ${filter === "all" ? "grid-cols-4" : "grid-cols-1 max-w-sm"}`}>
      {visibleColumns.map(({ status, label }) => (
        <KanbanColumn
          key={status}
          status={status}
          label={label}
          projects={projects.filter((p) => p.status === status)}
          tasks={tasks}
        />
      ))}
    </div>
  );
}
