"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, Task, ActivityEntry, ProjectStatus, ChecklistItem } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";
import Timer from "./Timer";
import { useToast } from "./ToastContext";
import Modal from "./Modal";

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
          (a: ActivityEntry) => a.entityId === project.id || tasks.some((t) => t.id === a.entityId)
        );
        setActivity(filtered);
      })
      .catch(() => {});
  }, [project.id, tasks]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTime = tasks.reduce((sum, t) => sum + t.totalSeconds, 0);
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <Modal onClose={onClose} ariaLabel={project.title} className="items-start justify-center pt-16">
      <div
        className="mb-16 w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-white">{project.title}</h2>
                <PriorityBadge priority={project.priority} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[project.status]}`}>
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
              {project.description && <p className="text-sm text-gray-400">{project.description}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => onEditProject(project)}
                className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
              >
                Edit
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <span>
              {completedCount}/{tasks.length} tasks complete
            </span>
            <span>Total time: {formatTime(totalTime)}</span>
          </div>
          {tasks.length > 0 && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700">
              <div
                className="h-1.5 rounded-full bg-green-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="border-b border-gray-700 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Tasks</h3>
            <button onClick={() => onAddTask(project.id)} className="text-xs text-blue-400 hover:text-blue-300">
              + Add Task
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs italic text-gray-600">No tasks yet</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <TaskDetailRow
                  key={task.id}
                  task={task}
                  projectId={project.id}
                  onToggleTaskComplete={onToggleTaskComplete}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* Checklist summary */}
        {tasks.some((t) => t.checklist.length > 0) && (
          <div className="px-6 pb-2 text-xs text-gray-500">
            {tasks.reduce((sum, t) => sum + t.checklist.filter((c) => c.done).length, 0)}/
            {tasks.reduce((sum, t) => sum + t.checklist.length, 0)} checklist items done
          </div>
        )}

        {/* Activity Log */}
        {activity.length > 0 && (
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Activity</h3>
            <div className="space-y-2">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs">
                  <span className="whitespace-nowrap text-gray-600">{formatRelative(entry.timestamp)}</span>
                  <span className="text-gray-400">{entry.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Checklist-aware task row ──────────────────────────────

function TaskDetailRow({
  task,
  projectId,
  onToggleTaskComplete,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  projectId: string;
  onToggleTaskComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const due = formatDueDate(task.dueDate);

  const toast = useToast();

  async function toggleChecklistItem(item: ChecklistItem) {
    try {
      await fetch(`/api/projects/${projectId}/tasks/${task.id}/checklist/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !item.done }),
      });
    } catch {
      toast("error", "Failed to update checklist item");
    }
  }

  async function addChecklistItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/projects/${projectId}/tasks/${task.id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newItem.trim() }),
      });
      setNewItem("");
    } catch {
      toast("error", "Failed to add checklist item");
    }
    setAdding(false);
  }

  async function deleteChecklistItem(itemId: string) {
    try {
      await fetch(`/api/projects/${projectId}/tasks/${task.id}/checklist/${itemId}`, {
        method: "DELETE",
      });
    } catch {
      toast("error", "Failed to delete checklist item");
    }
  }

  const checklistDone = task.checklist.filter((c) => c.done).length;

  return (
    <div className="group border-b border-gray-700/50 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleTaskComplete(task)}
          className={`h-4 w-4 flex-shrink-0 rounded border ${
            task.completed ? "border-green-600 bg-green-600" : "border-gray-500 hover:border-gray-400"
          } flex items-center justify-center`}
        >
          {task.completed && (
            <svg
              className="h-2.5 w-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${task.completed ? "text-gray-500 line-through" : "text-gray-200"}`}>
              {task.isRunning && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              )}
              {task.title}
            </span>
            <PriorityBadge priority={task.priority} />
            {task.checklist.length > 0 && (
              <span className="text-[10px] text-gray-500">
                {checklistDone}/{task.checklist.length}
              </span>
            )}
          </div>
          {(task.description || due) && (
            <div className="mt-0.5 flex items-center gap-2">
              {task.description && <span className="truncate text-xs text-gray-500">{task.description}</span>}
              {due && <span className={`text-xs ${due.style}`}>{due.text}</span>}
            </div>
          )}
          {task.labels.length > 0 && (
            <div className="mt-1 flex gap-1">
              {task.labels.map((l) => (
                <span key={l} className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>

        <Timer isRunning={task.isRunning} totalSeconds={task.totalSeconds} lastStarted={task.lastStarted} />

        <div className="hidden items-center gap-1 group-hover:flex">
          <button onClick={() => onEditTask(task)} className="p-1 text-gray-500 hover:text-gray-300" title="Edit">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button onClick={() => onDeleteTask(task)} className="p-1 text-gray-500 hover:text-red-400" title="Delete">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Checklist */}
      {task.checklist.length > 0 && (
        <div className="ml-6 mt-2 space-y-1">
          {task.checklist.map((item) => (
            <div key={item.id} className="group/cl flex items-center gap-2">
              <button
                onClick={() => toggleChecklistItem(item)}
                className={`h-3.5 w-3.5 flex-shrink-0 rounded border ${
                  item.done ? "border-green-600 bg-green-600" : "border-gray-600 hover:border-gray-400"
                } flex items-center justify-center`}
              >
                {item.done && (
                  <svg
                    className="h-2 w-2 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-xs ${item.done ? "text-gray-500 line-through" : "text-gray-400"}`}>
                {item.text}
              </span>
              <button
                onClick={() => deleteChecklistItem(item.id)}
                className="hidden p-0.5 text-gray-600 hover:text-red-400 group-hover/cl:block"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add checklist item */}
      <div className="ml-6 mt-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addChecklistItem();
          }}
          className="flex items-center gap-1"
        >
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="+ Add checklist item"
            className="w-full border-none bg-transparent py-0.5 text-xs text-gray-500 placeholder-gray-600 focus:text-gray-300 focus:outline-none"
          />
          {newItem.trim() && (
            <button
              type="submit"
              disabled={adding}
              className="whitespace-nowrap text-[10px] text-blue-400 hover:text-blue-300"
            >
              Add
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
