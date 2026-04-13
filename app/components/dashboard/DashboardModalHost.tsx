"use client";

import { useMemo } from "react";
import ProjectDetailModal from "../kanban/ProjectDetailModal";
import ProjectFormModal from "../kanban/ProjectFormModal";
import TaskFormModal from "../kanban/TaskFormModal";
import TimeReport from "../kanban/TimeReport";
import SetupWizard from "../SetupWizard";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useDashboardData } from "../shared/DashboardDataContext";
import { useDashboardUI } from "../shared/DashboardUIContext";
import { useKanbanActions } from "../shared/KanbanActionsContext";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";

export default function DashboardModalHost() {
  const { projects, tasks, fetchData, setHasCompletedSetup } = useDashboardData();
  const { modal, closeModal, openModal, handleDeleteProject, handleDeleteTask, handleToggleTaskComplete } =
    useKanbanActions();
  const { showSetupWizard, setShowSetupWizard, showShortcuts, setShowShortcuts } = useDashboardUI();

  const detailProject = useMemo(
    () =>
      modal.type === "projectDetail"
        ? (projects.find((project) => project.id === modal.project.id) ?? modal.project)
        : null,
    [modal, projects]
  );
  const detailTasks = useMemo(
    () => (detailProject ? tasks.filter((task) => task.projectId === detailProject.id) : []),
    [detailProject, tasks]
  );

  return (
    <>
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
          onEditProject={(project) => openModal({ type: "editProject", project })}
          onAddTask={(projectId) => openModal({ type: "createTask", projectId })}
          onEditTask={(task) => openModal({ type: "editTask", task })}
          onDeleteTask={(task) => openModal({ type: "deleteTask", task })}
          onToggleTaskComplete={handleToggleTaskComplete}
        />
      )}

      {modal.type === "timeReport" && <TimeReport onClose={closeModal} />}

      {showSetupWizard && (
        <SetupWizard
          onComplete={() => {
            setShowSetupWizard(false);
            setHasCompletedSetup(true);
          }}
          onDataChange={fetchData}
        />
      )}

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
