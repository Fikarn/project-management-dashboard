"use client";

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
  overdue: "text-red-400 bg-red-900/50",
  today: "text-yellow-400 bg-yellow-900/50",
  soon: "text-yellow-500/70 bg-yellow-900/30",
};

export default function TaskItem({ task, isSelected, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  const dueDateStatus = getDueDateStatus(task.dueDate);

  return (
    <div className={`flex items-center gap-2 py-1.5 group rounded px-1 -mx-1 transition-colors ${
      isSelected ? "bg-blue-900/30" : ""
    }`}>
      <button
        onClick={() => onToggleComplete(task)}
        className={`flex-shrink-0 w-4 h-4 rounded border ${
          task.completed
            ? "bg-green-600 border-green-600"
            : "border-gray-500 hover:border-gray-400"
        } flex items-center justify-center`}
      >
        {task.completed && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className={`text-sm truncate flex-1 ${
        task.completed ? "text-gray-500 line-through" : task.isRunning ? "text-white" : "text-gray-300"
      }`}>
        {task.isRunning && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
        )}
        {task.title}
      </span>

      <div className="flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} />

        {task.dueDate && dueDateStatus && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${DUE_DATE_STYLES[dueDateStatus]}`}>
            {dueDateStatus === "overdue" ? "Overdue" : dueDateStatus === "today" ? "Today" : task.dueDate.slice(5)}
          </span>
        )}

        {task.labels.length > 0 && (
          <span className="text-[10px] text-gray-500 hidden group-hover:inline">
            {task.labels.join(", ")}
          </span>
        )}

        <Timer
          isRunning={task.isRunning}
          totalSeconds={task.totalSeconds}
          lastStarted={task.lastStarted}
        />

        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            onClick={() => onEdit(task)}
            className="p-0.5 text-gray-500 hover:text-gray-300"
            title="Edit task"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task)}
            className="p-0.5 text-gray-500 hover:text-red-400"
            title="Delete task"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
