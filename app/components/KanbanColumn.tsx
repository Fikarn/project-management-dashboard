import type { Project, Task, ProjectStatus } from "@/lib/types";
import ProjectCard from "./ProjectCard";

interface KanbanColumnProps {
  status: ProjectStatus;
  label: string;
  projects: Project[];
  tasks: Task[];
}

const COLUMN_ACCENT: Record<ProjectStatus, string> = {
  todo: "border-gray-600",
  "in-progress": "border-blue-600",
  blocked: "border-red-600",
  done: "border-green-600",
};

export default function KanbanColumn({ status, label, projects, tasks }: KanbanColumnProps) {
  const columnTasks = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId);

  return (
    <div className={`flex flex-col min-w-0 border-t-2 ${COLUMN_ACCENT[status]} pt-3`}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </h2>
        <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">
          {projects.length}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {projects.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No projects</p>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={columnTasks(project.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
