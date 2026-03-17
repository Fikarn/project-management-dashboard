"use client";

import { useEffect, useState, useCallback } from "react";
import type { Project, Task, ViewFilter } from "@/lib/types";
import KanbanBoard from "./KanbanBoard";

interface ProjectsResponse {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [connected, setConnected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data: ProjectsResponse = await res.json();
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilter(data.filter);
    } catch {
      // fetch errors are transient; SSE will trigger a retry on next update
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("update", () => {
      fetchData();
    });

    es.onopen = () => setConnected(true);

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects; no manual retry needed
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [fetchData]);

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Projects</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          {connected ? "Live" : "Reconnecting…"}
        </div>
      </div>

      <KanbanBoard projects={projects} tasks={tasks} filter={filter} />
    </div>
  );
}
