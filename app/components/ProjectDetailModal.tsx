"use client";

import { useState, useEffect } from "react";
import type { Project, Task, ActivityEntry, ProjectStatus } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";
import Timer from "./Timer";

interface ProjectDetailModalProps {
  project: Project;
  tasks: Task[];
  onClose: () => void;
  onEditProject: (project: Project) => void;
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDueDate(dueDate: string | null): { text: string; style: string } | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `Overdue (${dueDate})`, style: "text-red-400" };
  if (diffDays === 0) return { text: "Due today", style: "text-yellow-400" };
  if (diffDays <= 3) return { text: `Due ${dueDate}`, style: "text-yellow-500" };
  return { text: `Due ${dueDate}`, style: "text-gray-400" };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ProjectDetailModal({
  project,
  tasks,
  onClose,
  onEditProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
}: ProjectDetailModalProps) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    fetch(`/api/activity?limit=20`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.activityLog.filter(
          (a: ActivityEntry) =>
            a.entityId === project.id ||
            tasks.some((t) => t.id === a.entityId)
        );
        setActivity(filtered);
      })
      .catch(() => {});
  }, [project.id, tasks]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTime = tasks.reduce((sum, t) => sum + t.totalSeconds, 0);
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl mb-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-white truncate">{project.title}</h2>
                <PriorityBadge priority={project.priority} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[project.status]}`}>
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-400">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onEditProject(project)}
                className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                Edit
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span>{completedCount}/{tasks.length} tasks complete</span>
            <span>Total time: {formatTime(totalTime)}</span>
          </div>
          {tasks.length > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
              <div
                className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Tasks</h3>
            <button
              onClick={() => onAddTask(project.id)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add Task
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No tasks yet</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => {
                const due = formatDueDate(task.dueDate);
                return (
                  <div key={task.id} className="flex items-center gap-2 py-2 group border-b border-gray-700/50 last:border-0">
                    <button
                      onClick={() => onToggleTaskComplete(task)}
                      className={`flex-shrink-0 w-4 h-4 rounded border ${
                        task.completed ? "bg-green-600 border-green-600" : "border-gray-500 hover:border-gray-400"
                      } flex items-center justify-center`}
                    >
                      {task.completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${task.completed ? "text-gray-500 line-through" : "text-gray-200"}`}>
                          {task.isRunning && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                          )}
                          {task.title}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      {(task.description || due) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.description && (
                            <span className="text-xs text-gray-500 truncate">{task.description}</span>
                          )}
                          {due && (
                            <span className={`text-xs ${due.style}`}>{due.text}</span>
                          )}
                        </div>
                      )}
                      {task.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {task.labels.map((l) => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Timer isRunning={task.isRunning} totalSeconds={task.totalSeconds} lastStarted={task.lastStarted} />

                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={() => onEditTask(task)} className="p-1 text-gray-500 hover:text-gray-300" title="Edit">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => onDeleteTask(task)} className="p-1 text-gray-500 hover:text-red-400" title="Delete">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Log */}
        {activity.length > 0 && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Activity</h3>
            <div className="space-y-2">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-600 whitespace-nowrap">{formatRelative(entry.timestamp)}</span>
                  <span className="text-gray-400">{entry.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
