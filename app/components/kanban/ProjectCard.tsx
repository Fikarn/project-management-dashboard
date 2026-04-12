"use client";

import { Pencil, Trash2 } from "lucide-react";
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
  todo: "bg-studio-700 text-studio-300",
  "in-progress": "bg-accent-blue/15 text-accent-blue",
  blocked: "bg-red-500/15 text-red-400",
  done: "bg-green-500/15 text-green-400",
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
    <div
      className={`group/card space-y-3 rounded-card bg-studio-850 p-4 shadow-card transition-all duration-150 hover:-translate-y-px hover:shadow-card-hover ${
        isSelected
          ? "border border-accent-blue/40 ring-1 ring-accent-blue/20"
          : "border border-studio-750 hover:border-studio-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3
            className="cursor-pointer truncate font-semibold leading-tight text-studio-100 transition-colors hover:text-accent-blue"
            onClick={() => onOpenProject(project)}
          >
            {project.title}
          </h3>
          <PriorityBadge priority={project.priority} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <span
            className={`whitespace-nowrap rounded-pill px-2 py-0.5 text-xxs font-medium ${STATUS_BADGE[project.status]}`}
          >
            {STATUS_LABEL[project.status]}
          </span>
          <div className="ml-1 hidden items-center gap-0.5 group-focus-within/card:flex group-hover/card:flex [@media(pointer:coarse)]:flex">
            <button
              type="button"
              onClick={() => onEditProject(project)}
              aria-label={`Edit ${project.title}`}
              className="rounded-badge p-1 text-studio-500 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            >
              <Pencil size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteProject(project)}
              aria-label={`Delete ${project.title}`}
              className="rounded-badge p-1 text-studio-500 transition-colors hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {project.description && <p className="line-clamp-2 text-xs text-studio-400">{project.description}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-studio-500">Updated {formatDate(project.lastUpdated)}</p>
        {totalCount > 0 && (
          <span className="text-xs text-studio-500">
            {completedCount}/{totalCount} tasks
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="h-1.5 w-full rounded-full bg-studio-750">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {tasks.length > 0 && (
        <div className="border-t border-studio-750 pt-2">
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
        className="w-full rounded-badge border border-dashed border-studio-700 py-1 text-xs text-studio-500 transition-colors hover:border-studio-600 hover:text-studio-300"
      >
        + Add Task
      </button>
    </div>
  );
}
