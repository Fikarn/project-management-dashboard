"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Trash2, Check } from "lucide-react";
import type { Project, Task, ActivityEntry, ProjectStatus, ChecklistItem } from "@/lib/types";
import { utilApi, checklistApi } from "@/lib/client-api";
import PriorityBadge from "./PriorityBadge";
import Timer from "./Timer";
import { useToast } from "../shared/ToastContext";
import Modal from "../shared/Modal";

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
  return { text: `Due ${dueDate}`, style: "text-studio-400" };
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
    utilApi
      .fetchActivity(20)
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
        className="mb-16 w-full max-w-2xl animate-scale-in rounded-card border border-studio-700 bg-studio-850 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-studio-750 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-studio-100">{project.title}</h2>
                <PriorityBadge priority={project.priority} />
                <span className={`rounded-pill px-2 py-0.5 text-xxs font-medium ${STATUS_BADGE[project.status]}`}>
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
              {project.description && <p className="text-sm text-studio-400">{project.description}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => onEditProject(project)}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-xs text-studio-300 transition-colors hover:bg-studio-600"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="rounded-badge p-1.5 text-studio-500 transition-colors hover:text-studio-200"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-badge bg-studio-800/50 px-3 py-1.5 text-xs text-studio-500">
              {completedCount}/{tasks.length} tasks complete
            </span>
            <span className="rounded-badge bg-studio-800/50 px-3 py-1.5 text-xs text-studio-500">
              Total time: {formatTime(totalTime)}
            </span>
          </div>
          {tasks.length > 0 && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-studio-750">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="border-b border-studio-750 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-studio-300">Tasks</h3>
            <button
              onClick={() => onAddTask(project.id)}
              className="text-xs text-accent-blue hover:text-accent-blue/80"
            >
              + Add Task
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs italic text-studio-500">No tasks yet</p>
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
          <div className="px-6 pb-2 text-xs text-studio-500">
            {tasks.reduce((sum, t) => sum + t.checklist.filter((c) => c.done).length, 0)}/
            {tasks.reduce((sum, t) => sum + t.checklist.length, 0)} checklist items done
          </div>
        )}

        {/* Activity Log */}
        {activity.length > 0 && (
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-studio-300">Activity</h3>
            <div className="relative space-y-2 pl-4">
              <div className="absolute bottom-0 left-[3px] top-1 w-0.5 rounded-full bg-studio-750" />
              {activity.map((entry) => (
                <div key={entry.id} className="relative flex items-start gap-2 text-xs">
                  <div className="absolute -left-4 top-1.5 h-1.5 w-1.5 rounded-full bg-studio-600" />
                  <span className="whitespace-nowrap text-studio-500">{formatRelative(entry.timestamp)}</span>
                  <span className="text-studio-400">{entry.detail}</span>
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
      await checklistApi.toggle(projectId, task.id, item.id, !item.done);
    } catch {
      toast("error", "Failed to update checklist item");
    }
  }

  async function addChecklistItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await checklistApi.add(projectId, task.id, newItem.trim());
      setNewItem("");
    } catch {
      toast("error", "Failed to add checklist item");
    }
    setAdding(false);
  }

  async function deleteChecklistItem(itemId: string) {
    try {
      await checklistApi.delete(projectId, task.id, itemId);
    } catch {
      toast("error", "Failed to delete checklist item");
    }
  }

  const checklistDone = task.checklist.filter((c) => c.done).length;

  return (
    <div className="group border-b border-studio-750/50 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleTaskComplete(task)}
          className={`h-4 w-4 flex-shrink-0 rounded border transition-colors ${
            task.completed ? "border-accent-green bg-accent-green" : "border-studio-600 hover:border-studio-400"
          } flex items-center justify-center`}
        >
          {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${task.completed ? "text-studio-500 line-through" : "text-studio-200"}`}>
              {task.isRunning && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
              )}
              {task.title}
            </span>
            <PriorityBadge priority={task.priority} />
            {task.checklist.length > 0 && (
              <span className="text-xxs text-studio-500">
                {checklistDone}/{task.checklist.length}
              </span>
            )}
          </div>
          {(task.description || due) && (
            <div className="mt-0.5 flex items-center gap-2">
              {task.description && <span className="truncate text-xs text-studio-500">{task.description}</span>}
              {due && <span className={`text-xs ${due.style}`}>{due.text}</span>}
            </div>
          )}
          {task.labels.length > 0 && (
            <div className="mt-1 flex gap-1">
              {task.labels.map((l) => (
                <span key={l} className="rounded-pill bg-studio-800 px-1.5 py-0.5 text-xxs text-studio-400">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>

        <Timer isRunning={task.isRunning} totalSeconds={task.totalSeconds} lastStarted={task.lastStarted} />

        <div className="hidden items-center gap-1 group-focus-within:flex group-hover:flex [@media(pointer:coarse)]:flex">
          <button
            onClick={() => onEditTask(task)}
            className="rounded-badge p-1 text-studio-500 transition-colors hover:text-studio-200"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDeleteTask(task)}
            className="rounded-badge p-1 text-studio-500 transition-colors hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={12} />
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
                className={`h-3.5 w-3.5 flex-shrink-0 rounded border transition-colors ${
                  item.done ? "border-accent-green bg-accent-green" : "border-studio-600 hover:border-studio-400"
                } flex items-center justify-center`}
              >
                {item.done && <Check size={8} className="text-white" strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-xs ${item.done ? "text-studio-500 line-through" : "text-studio-400"}`}>
                {item.text}
              </span>
              <button
                onClick={() => deleteChecklistItem(item.id)}
                className="hidden rounded-badge p-0.5 text-studio-500 transition-colors hover:text-red-400 group-focus-within/cl:block group-hover/cl:block"
              >
                <X size={10} />
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
            className="w-full !border-none !bg-transparent !px-0 !py-0.5 !text-xs !text-studio-500 !placeholder-studio-600 !ring-0 focus:!text-studio-300"
          />
          {newItem.trim() && (
            <button
              type="submit"
              disabled={adding}
              className="whitespace-nowrap text-xxs text-accent-blue hover:text-accent-blue/80"
            >
              Add
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
