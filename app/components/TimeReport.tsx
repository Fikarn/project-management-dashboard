"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";

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

  useEffect(() => {
    fetch("/api/reports/time")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <Modal onClose={onClose} ariaLabel="Time Report">
        <div
          className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-800 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </Modal>
    );
  }

  const maxProjectTime = Math.max(...data.byProject.map((p) => p.totalSeconds), 1);

  return (
    <Modal onClose={onClose} ariaLabel="Time Report" className="items-start justify-center pt-16">
      <div
        className="mb-16 w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Time Report</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{formatDuration(data.totalSeconds)}</p>
          <p className="text-xs text-gray-500">Total tracked time across all projects</p>
        </div>

        {/* By Project */}
        <div className="border-b border-gray-700 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">By Project</h3>
          {data.byProject.length === 0 ? (
            <p className="text-xs italic text-gray-600">No time tracked yet</p>
          ) : (
            <div className="space-y-3">
              {data.byProject.map((p) => (
                <div key={p.projectId}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-gray-200">{p.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{p.taskCount} tasks</span>
                      <span className="font-mono text-sm text-white">{formatDuration(p.totalSeconds)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
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
          <h3 className="mb-4 text-sm font-semibold text-gray-300">By Task</h3>
          {data.byTask.length === 0 ? (
            <p className="text-xs italic text-gray-600">No time tracked yet</p>
          ) : (
            <div className="space-y-2">
              {data.byTask.map((t) => (
                <div
                  key={t.taskId}
                  className="flex items-center justify-between border-b border-gray-700/50 py-1.5 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-sm text-gray-200">{t.taskTitle}</span>
                    <span className="ml-2 text-xs text-gray-500">{t.projectTitle}</span>
                    {t.isRunning && (
                      <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    )}
                  </div>
                  <span className="ml-4 flex-shrink-0 font-mono text-sm text-white">
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
