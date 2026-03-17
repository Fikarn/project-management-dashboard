import type { Project, Task, ProjectStatus } from "@/lib/types";
import ProjectCard from "./ProjectCard";

interface KanbanColumnProps {
  status: ProjectStatus;
  label: string;
  projects: Project[];
  tasks: Task[];
  onAddProject: (status: ProjectStatus) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onAddTask: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
}

const COLUMN_ACCENT: Record<ProjectStatus, string> = {
  todo: "border-gray-600",
  "in-progress": "border-blue-600",
  blocked: "border-red-600",
  done: "border-green-600",
};

export default function KanbanColumn({
  status,
  label,
  projects,
  tasks,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
}: KanbanColumnProps) {
  const columnTasks = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId);

  return (
    <div className={`flex flex-col min-w-0 border-t-2 ${COLUMN_ACCENT[status]} pt-3`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </h2>
          <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">
            {projects.length}
          </span>
        </div>
        <button
          onClick={() => onAddProject(status)}
          className="text-gray-600 hover:text-gray-300 transition-colors"
          title={`Add project to ${label}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
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
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onToggleTaskComplete={onToggleTaskComplete}
            />
          ))
        )}
      </div>
    </div>
  );
}
