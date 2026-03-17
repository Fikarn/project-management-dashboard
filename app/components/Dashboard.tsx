"use client";

import { useEffect, useState, useCallback } from "react";
import type { Project, Task, ViewFilter, ProjectStatus, Settings } from "@/lib/types";
import KanbanBoard from "./KanbanBoard";
import ProjectFormModal from "./ProjectFormModal";
import TaskFormModal from "./TaskFormModal";
import ConfirmDialog from "./ConfirmDialog";

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
  | { type: "deleteTask"; task: Task };

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [connected, setConnected] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data: ProjectsResponse = await res.json();
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilter(data.filter ?? data.settings?.viewFilter ?? "all");
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
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [fetchData]);

  // Close modal on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModal({ type: "none" });
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeModal = () => setModal({ type: "none" });

  async function handleToggleTaskComplete(task: Task) {
    await fetch(`/api/projects/${task.projectId}/tasks/${task.id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  async function handleDeleteProject(project: Project) {
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    closeModal();
  }

  async function handleDeleteTask(task: Task) {
    await fetch(`/api/projects/${task.projectId}/tasks/${task.id}`, { method: "DELETE" });
    closeModal();
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Projects</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setModal({ type: "createProject", defaultStatus: "todo" })}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            + New Project
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            {connected ? "Live" : "Reconnecting..."}
          </div>
        </div>
      </div>

      <KanbanBoard
        projects={projects}
        tasks={tasks}
        filter={filter}
        onAddProject={(status) => setModal({ type: "createProject", defaultStatus: status })}
        onEditProject={(project) => setModal({ type: "editProject", project })}
        onDeleteProject={(project) => setModal({ type: "deleteProject", project })}
        onAddTask={(projectId) => setModal({ type: "createTask", projectId })}
        onEditTask={(task) => setModal({ type: "editTask", task })}
        onDeleteTask={(task) => setModal({ type: "deleteTask", task })}
        onToggleTaskComplete={handleToggleTaskComplete}
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
    </div>
  );
}
