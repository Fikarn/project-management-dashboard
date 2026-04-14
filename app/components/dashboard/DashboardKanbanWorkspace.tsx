"use client";

import { useMemo } from "react";
import { BarChart3, Download, Plus, Upload } from "lucide-react";
import type { Task } from "@/lib/types";
import FilterBar from "../kanban/FilterBar";
import KanbanBoard from "../kanban/KanbanBoard";
import ErrorBoundary from "../shared/ErrorBoundary";
import { useDashboardData } from "../shared/DashboardDataContext";
import { useKanbanActions } from "../shared/KanbanActionsContext";

export default function DashboardKanbanWorkspace() {
  const {
    projects,
    tasks,
    filter,
    sortBy,
    selectedProjectId,
    selectedTaskId,
    hasCompletedSetup,
    fetchData,
    handleFilterChange,
    handleSortChange,
  } = useDashboardData();
  const {
    searchQuery,
    setSearchQuery,
    openModal,
    handleReorder,
    handleToggleTaskComplete,
    handleExport,
    handleImport,
  } = useKanbanActions();

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const existing = map.get(task.projectId);
      if (existing) existing.push(task);
      else map.set(task.projectId, [task]);
    }
    return map;
  }, [tasks]);

  const resultCount = useMemo(() => {
    if (!searchQuery) return undefined;
    const q = searchQuery.toLowerCase();

    return projects.filter((project) => {
      if (project.title.toLowerCase().includes(q) || project.description.toLowerCase().includes(q)) return true;

      const projectTasks = tasksByProject.get(project.id);
      if (!projectTasks) return false;

      return projectTasks.some(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.labels.some((label) => label.toLowerCase().includes(q))
      );
    }).length;
  }, [projects, searchQuery, tasksByProject]);

  const boardStats = useMemo(
    () => [
      { label: "Active Projects", value: projects.filter((project) => project.status !== "done").length },
      { label: "Running Timers", value: tasks.filter((task) => task.isRunning).length },
      { label: "Blocked", value: projects.filter((project) => project.status === "blocked").length },
      { label: "Open Tasks", value: tasks.filter((task) => !task.completed).length },
    ],
    [projects, tasks]
  );

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <div className="console-surface grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="console-label">Planning Workspace</p>
            <h2 className="mt-1 text-base font-semibold text-studio-100">
              Prep, handoffs, and timers stay visible without stealing the console.
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-studio-400">
              Use planning as an always-on sidecar: fast to scan, dense enough to monitor, and contained to its own
              panel.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {boardStats.map((stat) => (
              <div key={stat.label} className="console-stat-card min-w-[118px]">
                <div className="console-label">{stat.label}</div>
                <div className="console-stat-value">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <button
            type="button"
            onClick={() => openModal({ type: "createProject", defaultStatus: "todo" })}
            className="flex items-center gap-1.5 rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
          >
            <Plus size={14} aria-hidden="true" />
            New Project
          </button>

          <div className="flex items-center rounded-badge border border-studio-700 bg-studio-950/60">
            <button
              type="button"
              onClick={() => openModal({ type: "timeReport" })}
              className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-800 hover:text-studio-200"
              title="Time report"
            >
              <BarChart3 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-800 hover:text-studio-200"
              title="Export data"
            >
              <Download size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-800 hover:text-studio-200"
              title="Import data"
            >
              <Upload size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="console-surface flex min-h-0 flex-col overflow-hidden p-4">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          filter={filter}
          onFilterChange={handleFilterChange}
          resultCount={resultCount}
        />

        {projects.length === 0 && hasCompletedSetup && (
          <div className="mb-4 flex items-center justify-center rounded-card border border-dashed border-studio-700 bg-studio-950/35 py-10">
            <p className="text-sm text-studio-500">
              Click{" "}
              <button
                type="button"
                onClick={() => openModal({ type: "createProject", defaultStatus: "todo" })}
                className="font-medium text-accent-blue transition-colors hover:text-accent-blue/80"
              >
                + New Project
              </button>{" "}
              or press{" "}
              <kbd className="rounded-badge bg-studio-700 px-1.5 py-0.5 font-mono text-xs text-studio-400">N</kbd> to
              build your first planning board.
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1">
          <ErrorBoundary fallbackLabel="Board failed to render" onRetry={fetchData}>
            <KanbanBoard
              projects={projects}
              tasks={tasks}
              filter={filter}
              sortBy={sortBy}
              searchQuery={searchQuery}
              selectedProjectId={selectedProjectId}
              selectedTaskId={selectedTaskId}
              onAddProject={(status) => openModal({ type: "createProject", defaultStatus: status })}
              onEditProject={(project) => openModal({ type: "editProject", project })}
              onDeleteProject={(project) => openModal({ type: "deleteProject", project })}
              onOpenProject={(project) => openModal({ type: "projectDetail", project })}
              onAddTask={(projectId) => openModal({ type: "createTask", projectId })}
              onEditTask={(task) => openModal({ type: "editTask", task })}
              onDeleteTask={(task) => openModal({ type: "deleteTask", task })}
              onToggleTaskComplete={handleToggleTaskComplete}
              onReorder={handleReorder}
            />
          </ErrorBoundary>
        </div>
      </div>
    </section>
  );
}
