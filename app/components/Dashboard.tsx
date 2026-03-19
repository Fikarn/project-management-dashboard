"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Project, Task, ViewFilter, ProjectStatus, Settings, SortOption } from "@/lib/types";
import KanbanBoard from "./KanbanBoard";
import FilterBar from "./FilterBar";
import ProjectFormModal from "./ProjectFormModal";
import TaskFormModal from "./TaskFormModal";
import ProjectDetailModal from "./ProjectDetailModal";
import ConfirmDialog from "./ConfirmDialog";
import TimeReport from "./TimeReport";
import { useToast } from "./ToastContext";
import WelcomeModal from "./WelcomeModal";

interface ProjectsResponse {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
  settings: Settings;
}

type ModalState =
  | { type: "none" }
  | { type: "createProject"; defaultStatus: ProjectStatus }
  | { type: "editProject"; project: Project }
  | { type: "createTask"; projectId: string }
  | { type: "editTask"; task: Task }
  | { type: "deleteProject"; project: Project }
  | { type: "deleteTask"; task: Task }
  | { type: "projectDetail"; project: Project }
  | { type: "timeReport" };

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [searchQuery, setSearchQuery] = useState("");
  const [connected, setConnected] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data: ProjectsResponse = await res.json();
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilter(data.filter ?? data.settings?.viewFilter ?? "all");
      if (data.settings?.sortBy) setSortBy(data.settings.sortBy);
    } catch {
      toast("error", "Failed to load projects");
    }
  }, []);

  // Initial load + first-run welcome detection
  useEffect(() => {
    fetchData().then(() => setInitialLoadDone(true));
  }, [fetchData]);

  useEffect(() => {
    if (
      initialLoadDone &&
      projects.length === 0 &&
      !localStorage.getItem("hasSeenWelcome")
    ) {
      setShowWelcome(true);
    }
  }, [initialLoadDone, projects.length]);

  // SSE subscription
  useEffect(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("update", () => {
      fetchData();
    });

    es.onopen = () => setConnected(true);

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [fetchData]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if (e.key === "Escape") {
        setModal({ type: "none" });
        return;
      }

      // Don't fire shortcuts when typing in inputs
      if (isInput) return;

      switch (e.key) {
        case "n":
          e.preventDefault();
          setModal({ type: "createProject", defaultStatus: "todo" });
          break;
        case "s":
        case "/":
          e.preventDefault();
          document.getElementById("search-input")?.focus();
          break;
        case "1":
          e.preventDefault();
          handleFilterChange("todo");
          break;
        case "2":
          e.preventDefault();
          handleFilterChange("in-progress");
          break;
        case "3":
          e.preventDefault();
          handleFilterChange("blocked");
          break;
        case "4":
          e.preventDefault();
          handleFilterChange("done");
          break;
        case "0":
          e.preventDefault();
          handleFilterChange("all");
          break;
        case "r":
          e.preventDefault();
          setModal({ type: "timeReport" });
          break;
        case "e":
          e.preventDefault();
          handleExport();
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const [showShortcuts, setShowShortcuts] = useState(false);

  const closeModal = () => setModal({ type: "none" });

  async function handleFilterChange(newFilter: ViewFilter) {
    setFilter(newFilter);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewFilter: newFilter }),
      });
    } catch {
      toast("error", "Failed to save filter setting");
    }
  }

  async function handleSortChange(newSort: SortOption) {
    setSortBy(newSort);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortBy: newSort }),
      });
    } catch {
      toast("error", "Failed to save sort setting");
    }
  }

  async function handleReorder(projectId: string, newStatus: ProjectStatus, newIndex: number) {
    await fetch("/api/projects/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, newStatus, newIndex }),
    });
  }

  async function handleToggleTaskComplete(task: Task) {
    await fetch(`/api/projects/${task.projectId}/tasks/${task.id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  async function handleDeleteProject(project: Project) {
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      toast("success", `Deleted "${project.title}"`);
    } catch {
      toast("error", "Failed to delete project");
    }
    closeModal();
  }

  async function handleDeleteTask(task: Task) {
    try {
      await fetch(`/api/projects/${task.projectId}/tasks/${task.id}`, { method: "DELETE" });
      toast("success", `Deleted "${task.title}"`);
    } catch {
      toast("error", "Failed to delete task");
    }
    closeModal();
  }

  async function handleExport() {
    try {
      const res = await fetch("/api/backup");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `db-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "Backup exported");
    } catch {
      toast("error", "Failed to export backup");
    }
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast("success", "Backup restored");
      } catch {
        toast("error", "Invalid backup file");
      }
    };
    input.click();
  }

  // Keep detail modal's data fresh
  const detailProject =
    modal.type === "projectDetail"
      ? projects.find((p) => p.id === modal.project.id) ?? modal.project
      : null;
  const detailTasks =
    detailProject ? tasks.filter((t) => t.projectId === detailProject.id) : [];

  if (!initialLoadDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">Projects</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setModal({ type: "createProject", defaultStatus: "todo" })}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            + New Project
          </button>
          <button
            onClick={() => setModal({ type: "timeReport" })}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            title="Time report (r)"
          >
            Report
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
              title="Export data (e)"
            >
              Export
            </button>
            <button
              onClick={handleImport}
              className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
              title="Import data"
            >
              Import
            </button>
          </div>
          <Link
            href="/setup"
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            title="Stream Deck Setup"
          >
            &#9881; Deck
          </Link>
          <button
            onClick={() => setShowShortcuts((v) => !v)}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            {connected ? "Live" : "Reconnecting..."}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />

      {/* Kanban Board */}
      <KanbanBoard
        projects={projects}
        tasks={tasks}
        filter={filter}
        sortBy={sortBy}
        searchQuery={searchQuery}
        onAddProject={(status) => setModal({ type: "createProject", defaultStatus: status })}
        onEditProject={(project) => setModal({ type: "editProject", project })}
        onDeleteProject={(project) => setModal({ type: "deleteProject", project })}
        onOpenProject={(project) => setModal({ type: "projectDetail", project })}
        onAddTask={(projectId) => setModal({ type: "createTask", projectId })}
        onEditTask={(task) => setModal({ type: "editTask", task })}
        onDeleteTask={(task) => setModal({ type: "deleteTask", task })}
        onToggleTaskComplete={handleToggleTaskComplete}
        onReorder={handleReorder}
      />

      {/* Modals */}
      {(modal.type === "createProject" || modal.type === "editProject") && (
        <ProjectFormModal
          project={modal.type === "editProject" ? modal.project : undefined}
          defaultStatus={modal.type === "createProject" ? modal.defaultStatus : undefined}
          onClose={closeModal}
          onSaved={fetchData}
        />
      )}

      {(modal.type === "createTask" || modal.type === "editTask") && (
        <TaskFormModal
          task={modal.type === "editTask" ? modal.task : undefined}
          projectId={
            modal.type === "editTask" ? modal.task.projectId : modal.projectId
          }
          onClose={closeModal}
          onSaved={fetchData}
        />
      )}

      {modal.type === "deleteProject" && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${modal.project.title}" and all its tasks? This cannot be undone.`}
          onConfirm={() => handleDeleteProject(modal.project)}
          onCancel={closeModal}
        />
      )}

      {modal.type === "deleteTask" && (
        <ConfirmDialog
          title="Delete Task"
          message={`Delete "${modal.task.title}"? This cannot be undone.`}
          onConfirm={() => handleDeleteTask(modal.task)}
          onCancel={closeModal}
        />
      )}

      {modal.type === "projectDetail" && detailProject && (
        <ProjectDetailModal
          project={detailProject}
          tasks={detailTasks}
          onClose={closeModal}
          onEditProject={(p) => setModal({ type: "editProject", project: p })}
          onAddTask={(pid) => setModal({ type: "createTask", projectId: pid })}
          onEditTask={(t) => setModal({ type: "editTask", task: t })}
          onDeleteTask={(t) => setModal({ type: "deleteTask", task: t })}
          onToggleTaskComplete={handleToggleTaskComplete}
        />
      )}

      {modal.type === "timeReport" && (
        <TimeReport onClose={closeModal} />
      )}

      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onSeeded={fetchData}
        />
      )}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowShortcuts(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2 text-sm">
              {[
                ["n", "New project"],
                ["s  /", "Focus search"],
                ["1-4", "Filter to column"],
                ["0", "Show all columns"],
                ["r", "Time report"],
                ["e", "Export data"],
                ["Esc", "Close modal"],
                ["?", "Toggle this help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-400">{desc}</span>
                  <kbd className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
