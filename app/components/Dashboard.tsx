"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Lightbulb, Plus, BarChart3, Download, Upload, Monitor, HelpCircle, Check } from "lucide-react";
import type {
  Project,
  Task,
  ViewFilter,
  ProjectStatus,
  Settings,
  SortOption,
  DashboardView,
  Light,
  LightGroup,
  LightScene,
  LightingSettings,
} from "@/lib/types";
import KanbanBoard from "./kanban/KanbanBoard";
import FilterBar from "./kanban/FilterBar";
import ProjectFormModal from "./kanban/ProjectFormModal";
import TaskFormModal from "./kanban/TaskFormModal";
import ProjectDetailModal from "./kanban/ProjectDetailModal";
import ConfirmDialog from "./shared/ConfirmDialog";
import TimeReport from "./kanban/TimeReport";
import LightingView from "./lighting/LightingView";
import ErrorBoundary from "./shared/ErrorBoundary";
import { useToast } from "./shared/ToastContext";
import SetupWizard from "./SetupWizard";
import Modal from "./shared/Modal";
import { lightsApi, scenesApi, projectsApi, settingsApi, utilApi } from "@/lib/client-api";

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
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("kanban");
  const [lights, setLights] = useState<Light[]>([]);
  const [lightGroups, setLightGroups] = useState<LightGroup[]>([]);
  const [lightScenes, setLightScenes] = useState<LightScene[]>([]);
  const [lightingSettings, setLightingSettings] = useState<LightingSettings>({
    apolloBridgeIp: "2.0.0.1",
    dmxUniverse: 1,
    dmxEnabled: false,
    selectedLightId: null,
    selectedSceneId: null,
    grandMaster: 100,
    cameraMarker: null,
    subjectMarker: null,
  });
  const toast = useToast();
  const dashboardViewRef = useRef(dashboardView);
  dashboardViewRef.current = dashboardView;
  const disconnectedSinceRef = useRef<number | null>(null);
  const disconnectToastShownRef = useRef(false);

  const fetchLightingData = useCallback(async () => {
    try {
      const res = await lightsApi.fetchAll();
      const data = await res.json();
      setLights(data.lights);
      setLightGroups(data.lightGroups ?? []);
      setLightingSettings(data.lightingSettings);
      // Fetch scenes separately
      const scenesRes = await scenesApi.fetchAll();
      const scenesData = await scenesRes.json();
      setLightScenes(scenesData.scenes);
    } catch {
      if (dashboardViewRef.current === "lighting") {
        toast("error", "Failed to load lighting data");
      }
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    try {
      const res = await projectsApi.fetchAll();
      const data: ProjectsResponse = await res.json();
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilter(data.filter ?? data.settings?.viewFilter ?? "all");
      if (data.settings?.sortBy) setSortBy(data.settings.sortBy);
      if (data.settings?.selectedProjectId !== undefined) setSelectedProjectId(data.settings.selectedProjectId);
      if (data.settings?.selectedTaskId !== undefined) setSelectedTaskId(data.settings.selectedTaskId);
      if (data.settings?.dashboardView) setDashboardView(data.settings.dashboardView);
      if (data.settings?.hasCompletedSetup !== undefined) setHasCompletedSetup(data.settings.hasCompletedSetup);
    } catch {
      toast("error", "Failed to load projects");
    }
    // Always fetch lighting data too (needed for view toggle)
    await fetchLightingData();
  }, [fetchLightingData, toast]);

  // Initial load with auto-retry for Electron server startup delays
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxRetries = 5;
    const tryLoad = () => {
      fetchData()
        .then(() => {
          if (!cancelled) {
            setInitialLoadDone(true);
            setInitialLoadError(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          attempts++;
          if (attempts < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
            setTimeout(tryLoad, delay);
          } else {
            setInitialLoadError(true);
            setInitialLoadDone(true);
          }
        });
    };
    tryLoad();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  useEffect(() => {
    if (initialLoadDone && !hasCompletedSetup && projects.length === 0 && !localStorage.getItem("hasSeenWelcome")) {
      setShowSetupWizard(true);
    }
  }, [initialLoadDone, hasCompletedSetup, projects.length]);

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

      es.addEventListener("db-error", () => {
        toast("error", "Database read failed on server");
      });

      es.onopen = () => {
        backoff = 1000;
        setConnected("connected");
        fetchData(); // sync any missed updates
        if (disconnectedSinceRef.current && disconnectToastShownRef.current) {
          toast("success", "Connection restored");
        }
        disconnectedSinceRef.current = null;
        disconnectToastShownRef.current = false;
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected("disconnected");
        if (!disconnectedSinceRef.current) {
          disconnectedSinceRef.current = Date.now();
        }
        // Always close and reconnect — handles both CLOSED and CONNECTING error states
        es?.close();
        es = null;
        reconnectTimer = setTimeout(() => {
          connectSSE();
          backoff = Math.min(backoff * 2, 10000);
        }, backoff);
      };
    }

    connectSSE();

    // Check for extended disconnect every 5 seconds and show a toast
    const disconnectCheckInterval = setInterval(() => {
      const since = disconnectedSinceRef.current;
      if (since && Date.now() - since > 15000 && !disconnectToastShownRef.current) {
        disconnectToastShownRef.current = true;
        toast("error", "Connection lost. Changes may not be saved. Reconnecting...");
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(disconnectCheckInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
      setConnected("disconnected");
    };
  }, [fetchData, toast]);

  const handleViewToggle = useCallback(async () => {
    const newView: DashboardView = dashboardView === "kanban" ? "lighting" : "kanban";
    setDashboardView(newView);
    try {
      await settingsApi.update({ dashboardView: newView });
    } catch {
      toast("error", "Failed to save view setting");
    }
  }, [dashboardView, toast]);

  const handleFilterChange = useCallback(
    async (newFilter: ViewFilter) => {
      setFilter(newFilter);
      try {
        await settingsApi.update({ viewFilter: newFilter });
      } catch {
        toast("error", "Failed to save filter setting");
      }
    },
    [toast]
  );

  const handleExport = useCallback(async () => {
    try {
      const res = await utilApi.downloadBackup();
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
  }, [toast]);

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
  }, [handleViewToggle, handleFilterChange, handleExport]);

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

  async function handleSortChange(newSort: SortOption) {
    setSortBy(newSort);
    try {
      await settingsApi.update({ sortBy: newSort });
    } catch {
      toast("error", "Failed to save sort setting");
    }
  }

  async function handleReorder(projectId: string, newStatus: ProjectStatus, newIndex: number) {
    try {
      const res = await projectsApi.reorder({ projectId, newStatus, newIndex });
      if (!res.ok) {
        toast("error", "Failed to reorder project");
        fetchData(); // Re-sync UI on failure
      }
    } catch {
      toast("error", "Failed to reorder project");
      fetchData(); // Re-sync UI on failure
    }
  }

  async function handleToggleTaskComplete(task: Task) {
    try {
      await fetch(`/api/projects/${task.projectId}/tasks/${task.id}/toggle`, { method: "POST" });
    } catch {
      toast("error", "Failed to toggle task");
    }
  }

  async function handleDeleteProject(project: Project) {
    try {
      await projectsApi.delete(project.id);
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
        await utilApi.restoreBackup(data);
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
      <div className="flex min-h-screen animate-fade-in items-center justify-center">
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-2 border-studio-700 border-t-accent-blue" />
          <p className="text-sm text-studio-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (initialLoadError) {
    return (
      <div className="flex min-h-screen animate-fade-in items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold text-studio-100">Failed to connect to server</p>
          <p className="mb-4 text-sm text-studio-400">The server may still be starting up. Please try again.</p>
          <button
            onClick={() => {
              setInitialLoadError(false);
              setInitialLoadDone(false);
            }}
            className="rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {/* ── Brand header zone ── */}
      <div className="border-b border-accent-blue/20 bg-accent-blue/[0.04]">
        <div className="h-[3px] bg-accent-blue" />
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          {/* Left: View toggle */}
          <div className="flex rounded-badge border border-studio-700 bg-studio-800 p-0.5">
            <button
              onClick={() => {
                if (dashboardView !== "kanban") handleViewToggle();
              }}
              className={`flex items-center gap-1.5 rounded-badge px-4 py-1.5 text-sm font-medium transition-all ${
                dashboardView === "kanban"
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              <LayoutGrid size={14} />
              Projects
            </button>
            <button
              onClick={() => {
                if (dashboardView !== "lighting") handleViewToggle();
              }}
              className={`flex items-center gap-1.5 rounded-badge px-4 py-1.5 text-sm font-medium transition-all ${
                dashboardView === "lighting"
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              <Lightbulb size={14} />
              Lights
            </button>
          </div>

          {/* Center: Logo */}
          <Image
            src="/images/sse-logo-white.png"
            alt="SSE Executive Education"
            width={120}
            height={32}
            className="h-[32px] w-auto opacity-85 transition-opacity hover:opacity-100"
          />

          {/* Right: Live indicator + global utilities */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-micro text-studio-500">
              {lastSavedKey > 0 && (
                <span key={lastSavedKey} className="flex animate-fade-out items-center gap-1 text-accent-green">
                  <Check size={10} />
                  Saved
                </span>
              )}
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  connected === "connected"
                    ? "bg-accent-green"
                    : connected === "connecting"
                      ? "bg-accent-amber"
                      : "bg-accent-red"
                }`}
              />
              {connected === "connected" ? "Live" : connected === "connecting" ? "Connecting..." : "Reconnecting..."}
            </div>
            <Link
              href="/setup"
              className="flex items-center gap-1.5 rounded-badge border border-studio-700 bg-studio-800 px-3 py-1.5 text-xs text-studio-400 transition-colors hover:bg-studio-750 hover:text-studio-200"
            >
              <Monitor size={14} />
              Stream Deck
            </Link>
            <button
              onClick={() => {
                setShowShortcuts((v) => !v);
                setShowShortcutHint(false);
              }}
              className={`rounded-badge border border-studio-700 bg-studio-800 p-2 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-200 ${showShortcutHint ? "animate-pulse ring-2 ring-accent-blue" : ""}`}
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-4">
        {/* Action bar — kanban only (lighting view has its own toolbar) */}
        {dashboardView === "kanban" && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModal({ type: "createProject", defaultStatus: "todo" })}
                className="flex items-center gap-1.5 rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 shadow-sm transition-colors hover:bg-accent-blue/80"
              >
                <Plus size={14} />
                New Project
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-badge border border-studio-700 bg-studio-800">
                <button
                  onClick={() => setModal({ type: "timeReport" })}
                  className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-200"
                  title="Time report (R)"
                >
                  <BarChart3 size={16} />
                </button>
                <button
                  onClick={handleExport}
                  className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-200"
                  title="Export data (E)"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={handleImport}
                  className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-200"
                  title="Import data"
                >
                  <Upload size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {dashboardView === "kanban" ? (
          <>
            {/* Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />

            {/* Empty board hint */}
            {projects.length === 0 && hasCompletedSetup && (
              <div className="mb-4 flex items-center justify-center rounded-card border border-dashed border-studio-700 bg-studio-850/30 py-8">
                <p className="text-sm text-studio-500">
                  Click{" "}
                  <button
                    onClick={() => setModal({ type: "createProject", defaultStatus: "todo" })}
                    className="font-medium text-accent-blue hover:text-accent-blue/80"
                  >
                    + New Project
                  </button>{" "}
                  or press{" "}
                  <kbd className="rounded-badge bg-studio-700 px-1.5 py-0.5 font-mono text-xs text-studio-400">N</kbd>{" "}
                  to get started
                </p>
              </div>
            )}

            {/* Kanban Board */}
            <ErrorBoundary fallbackLabel="Board failed to render" onRetry={fetchData}>
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
            </ErrorBoundary>
          </>
        ) : (
          <ErrorBoundary fallbackLabel="Lighting view failed to render" onRetry={fetchData}>
            <LightingView
              lights={lights}
              lightGroups={lightGroups}
              lightScenes={lightScenes}
              lightingSettings={lightingSettings}
              onDataChange={fetchData}
            />
          </ErrorBoundary>
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

        {/* Setup Wizard */}
        {showSetupWizard && (
          <SetupWizard
            onComplete={() => {
              setShowSetupWizard(false);
              setHasCompletedSetup(true);
            }}
            onDataChange={fetchData}
          />
        )}

        {/* Keyboard Shortcuts & Help */}
        {showShortcuts && (
          <Modal onClose={() => setShowShortcuts(false)} ariaLabel="Keyboard Shortcuts & Help">
            <div className="w-full max-w-sm animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal">
              <h2 className="mb-4 text-lg font-semibold text-studio-100">Keyboard Shortcuts</h2>
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
                    <span className="text-studio-400">{desc}</span>
                    <kbd className="rounded-badge border border-studio-600 bg-studio-700 px-2 py-0.5 font-mono text-xs text-studio-300">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>

              {/* Data Safety */}
              <div className="mt-4 border-t border-studio-750 pt-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-studio-400">Data Safety</h3>
                <p className="text-xs text-studio-500">
                  Data saves automatically on every change. Backups every 30 min (last 10 kept). Press{" "}
                  <kbd className="rounded-badge border border-studio-600 bg-studio-700 px-1 py-0.5 font-mono text-studio-400">
                    E
                  </kbd>{" "}
                  to export anytime.
                </p>
              </div>

              {/* Getting Started */}
              <div className="mt-3 border-t border-studio-750 pt-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-studio-400">Getting Started</h3>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => {
                      setShowShortcuts(false);
                      if (dashboardView !== "lighting") handleViewToggle();
                    }}
                    className="text-accent-blue hover:text-accent-blue/80"
                  >
                    Set up lighting
                  </button>
                  <a href="/setup" className="text-accent-blue hover:text-accent-blue/80">
                    Stream Deck setup
                  </a>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </main>
  );
}
