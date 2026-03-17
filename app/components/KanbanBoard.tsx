import type { Project, Task, ProjectStatus, ViewFilter } from "@/lib/types";
import KanbanColumn from "./KanbanColumn";

interface KanbanBoardProps {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
  onAddProject: (status: ProjectStatus) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onAddTask: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
}

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in-progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

export default function KanbanBoard({
  projects,
  tasks,
  filter,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
}: KanbanBoardProps) {
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
          onAddProject={onAddProject}
          onEditProject={onEditProject}
          onDeleteProject={onDeleteProject}
          onAddTask={onAddTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onToggleTaskComplete={onToggleTaskComplete}
        />
      ))}
    </div>
  );
}
