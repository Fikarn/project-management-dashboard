"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import Timer from "./Timer";
import PriorityBadge from "./PriorityBadge";

interface TaskItemProps {
  task: Task;
  isSelected?: boolean;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function getDueDateStatus(dueDate: string | null): "overdue" | "today" | "soon" | null {
  if (!dueDate) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "soon";
  return null;
}

const DUE_DATE_STYLES = {
  overdue: "text-red-400 bg-red-500/15",
  today: "text-yellow-400 bg-yellow-500/15",
  soon: "text-yellow-500/70 bg-yellow-500/10",
};

export default function TaskItem({ task, isSelected, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  const dueDateStatus = getDueDateStatus(task.dueDate);

  return (
    <div
      className={`group -mx-1 flex items-center gap-2 rounded-badge px-1 py-1.5 transition-colors ${
        isSelected ? "bg-accent-blue/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
        className={`h-4 w-4 flex-shrink-0 rounded border transition-colors ${
          task.completed ? "border-accent-green bg-accent-green" : "border-studio-600 hover:border-studio-400"
        } flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50`}
      >
        {task.completed && <Check size={10} className="text-white" strokeWidth={3} aria-hidden="true" />}
      </button>

      <span
        className={`flex-1 truncate text-sm ${
          task.completed ? "text-studio-500 line-through" : task.isRunning ? "text-studio-100" : "text-studio-300"
        }`}
      >
        {task.isRunning && (
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
        )}
        {task.title}
      </span>

      <div className="flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} />

        {task.dueDate && dueDateStatus && (
          <span className={`rounded-badge px-1.5 py-0.5 text-xxs ${DUE_DATE_STYLES[dueDateStatus]}`}>
            {dueDateStatus === "overdue" ? "Overdue" : dueDateStatus === "today" ? "Today" : task.dueDate.slice(5)}
          </span>
        )}

        {task.labels.length > 0 && (
          <span className="hidden text-xxs text-studio-500 group-hover:inline">{task.labels.join(", ")}</span>
        )}

        <Timer isRunning={task.isRunning} totalSeconds={task.totalSeconds} lastStarted={task.lastStarted} />

        <div className="hidden items-center gap-0.5 group-focus-within:flex group-hover:flex [@media(pointer:coarse)]:flex">
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            className="rounded-badge p-0.5 text-studio-500 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <Pencil size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
            className="rounded-badge p-0.5 text-studio-500 transition-colors hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
