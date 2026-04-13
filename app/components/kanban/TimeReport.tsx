"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Modal from "../shared/Modal";
import { useToast } from "../shared/ToastContext";
import { utilApi } from "@/lib/client-api";

interface ProjectTime {
  projectId: string;
  title: string;
  totalSeconds: number;
  taskCount: number;
}

interface TaskTime {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectTitle: string;
  totalSeconds: number;
  isRunning: boolean;
}

interface TimeData {
  totalSeconds: number;
  byProject: ProjectTime[];
  byTask: TaskTime[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface TimeReportProps {
  onClose: () => void;
}

export default function TimeReport({ onClose }: TimeReportProps) {
  const [data, setData] = useState<TimeData | null>(null);
  const toast = useToast();

  useEffect(() => {
    utilApi
      .fetchTimeReport()
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast("error", "Failed to load time report"));
  }, [toast]);

  if (!data) {
    return (
      <Modal onClose={onClose} ariaLabel="Time Report">
        <div
          className="w-full max-w-2xl animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-studio-400">Loading...</p>
        </div>
      </Modal>
    );
  }

  const maxProjectTime = Math.max(...data.byProject.map((p) => p.totalSeconds), 1);

  return (
    <Modal onClose={onClose} ariaLabel="Time Report" className="items-start justify-center pt-16">
      <div
        className="mb-16 w-full max-w-2xl animate-scale-in rounded-card border border-studio-700 bg-studio-850 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-studio-750 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-studio-100">Time Report</h2>
            <button
              onClick={onClose}
              className="rounded-badge p-1.5 text-studio-500 transition-colors hover:text-studio-200"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-2 text-3xl font-bold text-studio-50">{formatDuration(data.totalSeconds)}</p>
          <p className="text-xs text-studio-500">Total tracked time across all projects</p>
        </div>

        {/* By Project */}
        <div className="border-b border-studio-750 p-6">
          <h3 className="mb-4 text-sm font-semibold text-studio-300">By Project</h3>
          {data.byProject.length === 0 ? (
            <p className="text-xs italic text-studio-500">No time tracked yet</p>
          ) : (
            <div className="space-y-3">
              {data.byProject.map((p) => (
                <div key={p.projectId}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-studio-200">{p.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-studio-500">{p.taskCount} tasks</span>
                      <span className="font-mono text-sm tabular-nums text-studio-100">
                        {formatDuration(p.totalSeconds)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-studio-750">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sse-green to-sse-sky transition-all duration-300"
                      style={{ width: `${(p.totalSeconds / maxProjectTime) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Task */}
        <div className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-studio-300">By Task</h3>
          {data.byTask.length === 0 ? (
            <p className="text-xs italic text-studio-500">No time tracked yet</p>
          ) : (
            <div className="space-y-0">
              {data.byTask.map((t, i) => (
                <div
                  key={t.taskId}
                  className={`flex items-center justify-between border-b border-studio-750/50 py-2 last:border-0 ${
                    i % 2 === 1 ? "bg-studio-800/30" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-sm text-studio-200">{t.taskTitle}</span>
                    <span className="ml-2 text-xs text-studio-500">{t.projectTitle}</span>
                    {t.isRunning && (
                      <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                    )}
                  </div>
                  <span className="ml-4 flex-shrink-0 font-mono text-sm tabular-nums text-studio-100">
                    {formatDuration(t.totalSeconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
