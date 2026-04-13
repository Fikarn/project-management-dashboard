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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[22px] border border-studio-700/80 bg-studio-900/70 p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-[0.22em] text-studio-500">Secondary Workspace</p>
          <h2 className="mt-2 text-lg font-semibold text-studio-100">Production planning board</h2>
          <p className="mt-1 max-w-2xl text-sm text-studio-400">
            Use this board for prep, checklists, timing, and handoffs while lights and audio remain the primary control
            surfaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      <div className="rounded-[22px] border border-studio-700/80 bg-studio-900/60 p-4 shadow-card">
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
    </section>
  );
}
