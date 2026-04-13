"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Project, Task, ProjectStatus } from "@/lib/types";
import { useToast } from "./ToastContext";
import { useDashboardData } from "./DashboardDataContext";
import { projectsApi, utilApi } from "@/lib/client-api";

export type ModalState =
  | { type: "none" }
  | { type: "createProject"; defaultStatus: ProjectStatus }
  | { type: "editProject"; project: Project }
  | { type: "createTask"; projectId: string }
  | { type: "editTask"; task: Task }
  | { type: "deleteProject"; project: Project }
  | { type: "deleteTask"; task: Task }
  | { type: "projectDetail"; project: Project }
  | { type: "timeReport" };

interface KanbanActionsContextValue {
  modal: ModalState;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openModal: (state: ModalState) => void;
  closeModal: () => void;
  handleReorder: (projectId: string, newStatus: ProjectStatus, newIndex: number) => Promise<void>;
  handleToggleTaskComplete: (task: Task) => Promise<void>;
  handleDeleteProject: (project: Project) => Promise<void>;
  handleDeleteTask: (task: Task) => Promise<void>;
  handleExport: () => Promise<void>;
  handleImport: () => void;
}

const KanbanActionsContext = createContext<KanbanActionsContextValue | null>(null);

export function useKanbanActions(): KanbanActionsContextValue {
  const ctx = useContext(KanbanActionsContext);
  if (!ctx) throw new Error("useKanbanActions must be used within KanbanActionsProvider");
  return ctx;
}

export function KanbanActionsProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();
  const { fetchData } = useDashboardData();

  const openModal = useCallback((state: ModalState) => setModal(state), []);
  const closeModal = useCallback(() => setModal({ type: "none" }), []);

  const handleReorder = useCallback(
    async (projectId: string, newStatus: ProjectStatus, newIndex: number) => {
      try {
        const res = await projectsApi.reorder({ projectId, newStatus, newIndex });
        if (!res.ok) {
          toast("error", "Failed to reorder project");
          fetchData();
        }
      } catch {
        toast("error", "Failed to reorder project");
        fetchData();
      }
    },
    [toast, fetchData]
  );

  const handleToggleTaskComplete = useCallback(
    async (task: Task) => {
      try {
        await fetch(`/api/projects/${task.projectId}/tasks/${task.id}/toggle`, { method: "POST" });
      } catch {
        toast("error", "Failed to toggle task");
      }
    },
    [toast]
  );

  const handleDeleteProject = useCallback(
    async (project: Project) => {
      try {
        await projectsApi.delete(project.id);
        toast("success", `Deleted "${project.title}"`);
      } catch {
        toast("error", "Failed to delete project");
      }
      closeModal();
    },
    [toast, closeModal]
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      try {
        await fetch(`/api/projects/${task.projectId}/tasks/${task.id}`, { method: "DELETE" });
        toast("success", `Deleted "${task.title}"`);
      } catch {
        toast("error", "Failed to delete task");
      }
      closeModal();
    },
    [toast, closeModal]
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

  const handleImport = useCallback(() => {
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
  }, [toast]);

  const value = useMemo(
    (): KanbanActionsContextValue => ({
      modal,
      searchQuery,
      setSearchQuery,
      openModal,
      closeModal,
      handleReorder,
      handleToggleTaskComplete,
      handleDeleteProject,
      handleDeleteTask,
      handleExport,
      handleImport,
    }),
    [
      modal,
      searchQuery,
      openModal,
      closeModal,
      handleReorder,
      handleToggleTaskComplete,
      handleDeleteProject,
      handleDeleteTask,
      handleExport,
      handleImport,
    ]
  );

  return <KanbanActionsContext.Provider value={value}>{children}</KanbanActionsContext.Provider>;
}
