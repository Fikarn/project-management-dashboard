"use client";

import type { Project, Task, ProjectStatus } from "@/lib/types";
import TaskItem from "./TaskItem";
import PriorityBadge from "./PriorityBadge";

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  isSelected: boolean;
  selectedTaskId: string | null;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onOpenProject: (project: Project) => void;
  onAddTask: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
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

export default function ProjectCard({
  project,
  tasks,
  isSelected,
  selectedTaskId,
  onEditProject,
  onDeleteProject,
  onOpenProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
}: ProjectCardProps) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 space-y-3 group/card transition-all ${
      isSelected ? "ring-2 ring-blue-500 border border-blue-500/30" : "border border-gray-700"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className="font-semibold text-white leading-tight truncate cursor-pointer hover:text-blue-400 transition-colors"
            onClick={() => onOpenProject(project)}
          >
            {project.title}
          </h3>
          <PriorityBadge priority={project.priority} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${STATUS_BADGE[project.status]}`}
          >
            {STATUS_LABEL[project.status]}
          </span>
          <div className="hidden group-hover/card:flex items-center gap-0.5 ml-1">
            <button
              onClick={() => onEditProject(project)}
              className="p-0.5 text-gray-500 hover:text-gray-300"
              title="Edit project"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDeleteProject(project)}
              className="p-0.5 text-gray-500 hover:text-red-400"
              title="Delete project"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Updated {formatDate(project.lastUpdated)}</p>
        {totalCount > 0 && (
          <span className="text-xs text-gray-500">{completedCount}/{totalCount} tasks</span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div
            className="bg-green-600 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {tasks.length > 0 && (
        <div className="border-t border-gray-700 pt-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={isSelected && task.id === selectedTaskId}
              onToggleComplete={onToggleTaskComplete}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => onAddTask(project.id)}
        className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 border border-dashed border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        + Add Task
      </button>
    </div>
  );
}
