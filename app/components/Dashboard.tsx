"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type {
  Project,
  Task,
  ViewFilter,
  ProjectStatus,
  Settings,
  SortOption,
  DashboardView,
  Light,
  LightScene,
  LightingSettings,
} from "@/lib/types";
import KanbanBoard from "./KanbanBoard";
import FilterBar from "./FilterBar";
import ProjectFormModal from "./ProjectFormModal";
import TaskFormModal from "./TaskFormModal";
import ProjectDetailModal from "./ProjectDetailModal";
import ConfirmDialog from "./ConfirmDialog";
import TimeReport from "./TimeReport";
import LightingView from "./LightingView";
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [connected, setConnected] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [lastSavedKey, setLastSavedKey] = useState(0);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("kanban");
  const [lights, setLights] = useState<Light[]>([]);
  const [lightScenes, setLightScenes] = useState<LightScene[]>([]);
  const [lightingSettings, setLightingSettings] = useState<LightingSettings>({
    apolloBridgeIp: "2.0.0.1",
    dmxUniverse: 1,
    dmxEnabled: false,
    selectedLightId: null,
    selectedSceneId: null,
  });
  const toast = useToast();

  const fetchLightingData = useCallback(async () => {
    try {
      const res = await fetch("/api/lights", { cache: "no-store" });
      const data = await res.json();
      setLights(data.lights);
      setLightingSettings(data.lightingSettings);
      // Fetch scenes separately
      const scenesRes = await fetch("/api/lights/scenes", { cache: "no-store" });
      const scenesData = await scenesRes.json();
      setLightScenes(scenesData.scenes);
    } catch {
      // Lighting data fetch failed silently — non-critical
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data: ProjectsResponse = await res.json();
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilter(data.filter ?? data.settings?.viewFilter ?? "all");
      if (data.settings?.sortBy) setSortBy(data.settings.sortBy);
      if (data.settings?.selectedProjectId !== undefined) setSelectedProjectId(data.settings.selectedProjectId);
      if (data.settings?.selectedTaskId !== undefined) setSelectedTaskId(data.settings.selectedTaskId);
      if (data.settings?.dashboardView) setDashboardView(data.settings.dashboardView);
    } catch {
      toast("error", "Failed to load projects");
    }
    // Always fetch lighting data too (needed for view toggle)
    await fetchLightingData();
  }, [fetchLightingData]);

  // Initial load + first-run welcome detection
  useEffect(() => {
    fetchData().then(() => setInitialLoadDone(true));
  }, [fetchData]);

  useEffect(() => {
    if (initialLoadDone && projects.length === 0 && !localStorage.getItem("hasSeenWelcome")) {
      setShowWelcome(true);
    }
  }, [initialLoadDone, projects.length]);

  // SSE subscription with auto-reconnect
  useEffect(() => {
    let es: EventSource | null = null;
    let backoff = 1000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function connectSSE() {
      if (cancelled) return;
      setConnected("connecting");
      es = new EventSource("/api/events");

      es.addEventListener("update", () => {
        fetchData();
        setLastSavedKey((k) => k + 1);
      });

      es.onopen = () => {
        backoff = 1000;
        setConnected("connected");
        fetchData(); // sync any missed updates
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected("disconnected");
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          reconnectTimer = setTimeout(() => {
            connectSSE();
            backoff = Math.min(backoff * 2, 10000);
          }, backoff);
        }
      };
    }

    connectSSE();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
      setConnected("disconnected");
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
        case "l":
          e.preventDefault();
          handleViewToggle();
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
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("hasSeenShortcutHint")) {
      setShowShortcutHint(true);
      const timer = setTimeout(() => {
        setShowShortcutHint(false);
        localStorage.setItem("hasSeenShortcutHint", "1");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeModal = () => setModal({ type: "none" });

  async function handleViewToggle() {
    const newView: DashboardView = dashboardView === "kanban" ? "lighting" : "kanban";
    setDashboardView(newView);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardView: newView }),
      });
    } catch {
      toast("error", "Failed to save view setting");
    }
  }

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
    try {
      await fetch("/api/projects/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, newStatus, newIndex }),
      });
    } catch {
      toast("error", "Failed to reorder project");
    }
  }

  async function handleToggleTaskComplete(task: Task) {
    try {
      await fetch(`/api/projects/${task.projectId}/tasks/${task.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      toast("error", "Failed to toggle task");
    }
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
    modal.type === "projectDetail" ? (projects.find((p) => p.id === modal.project.id) ?? modal.project) : null;
  const detailTasks = detailProject ? tasks.filter((t) => t.projectId === detailProject.id) : [];

  if (!initialLoadDone) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
          <p className="text-sm text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-700 bg-gray-800 p-0.5">
            <button
              onClick={() => {
                if (dashboardView !== "kanban") handleViewToggle();
              }}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                dashboardView === "kanban" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => {
                if (dashboardView !== "lighting") handleViewToggle();
              }}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                dashboardView === "lighting" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Lights
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {dashboardView === "kanban" && (
            <button
              onClick={() => setModal({ type: "createProject", defaultStatus: "todo" })}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-500"
            >
              + New Project
            </button>
          )}
          <button
            onClick={() => setModal({ type: "timeReport" })}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
            title="Time report (r)"
          >
            Report
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
              title="Export data (e)"
            >
              Export
            </button>
            <button
              onClick={handleImport}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
              title="Import data"
            >
              Import
            </button>
          </div>
          <Link
            href="/setup"
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
            title="Stream Deck Setup"
          >
            &#9881; Deck
          </Link>
          <button
            onClick={() => {
              setShowShortcuts((v) => !v);
              setShowShortcutHint(false);
            }}
            className={`rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 ${showShortcutHint ? "animate-pulse ring-2 ring-blue-500" : ""}`}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {lastSavedKey > 0 && (
              <span key={lastSavedKey} className="animate-fade-out flex items-center gap-1 text-green-500">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                connected === "connected" ? "bg-green-500" : connected === "connecting" ? "bg-yellow-500" : "bg-red-500"
              }`}
            />
            {connected === "connected" ? "Live" : connected === "connecting" ? "Connecting..." : "Reconnecting..."}
          </div>
        </div>
      </div>

      {dashboardView === "kanban" ? (
        <>
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
            selectedProjectId={selectedProjectId}
            selectedTaskId={selectedTaskId}
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
        </>
      ) : (
        <LightingView
          lights={lights}
          lightScenes={lightScenes}
          lightingSettings={lightingSettings}
          onDataChange={fetchData}
        />
      )}

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
          projectId={modal.type === "editTask" ? modal.task.projectId : modal.projectId}
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

      {modal.type === "timeReport" && <TimeReport onClose={closeModal} />}

      {/* Welcome Modal */}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} onSeeded={fetchData} />}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Keyboard Shortcuts</h2>
            <div className="space-y-2 text-sm">
              {[
                ["n", "New project"],
                ["s  /", "Focus search"],
                ["1-4", "Filter to column"],
                ["0", "Show all columns"],
                ["l", "Toggle lights view"],
                ["r", "Time report"],
                ["e", "Export data"],
                ["Esc", "Close modal"],
                ["?", "Toggle this help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-400">{desc}</span>
                  <kbd className="rounded bg-gray-700 px-2 py-0.5 font-mono text-xs text-gray-300">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
