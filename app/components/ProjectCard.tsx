import type { Project, Task, ProjectStatus } from "@/lib/types";
import TaskItem from "./TaskItem";

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  todo: "bg-gray-700 text-gray-300",
  "in-progress": "bg-blue-900 text-blue-300",
  blocked: "bg-red-900 text-red-300",
  done: "bg-green-900 text-green-300",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  blocked: "Blocked",
  done: "Done",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectCard({ project, tasks }: ProjectCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white leading-tight">{project.title}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${STATUS_BADGE[project.status]}`}
        >
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <p className="text-xs text-gray-500">Updated {formatDate(project.lastUpdated)}</p>

      {tasks.length > 0 && (
        <div className="border-t border-gray-700 pt-2 space-y-0.5">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
