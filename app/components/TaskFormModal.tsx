"use client";

import { useState } from "react";
import type { Task, Priority } from "@/lib/types";
import { useToast } from "./ToastContext";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";

interface TaskFormModalProps {
  task?: Task;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "p0", label: "P0 - Critical" },
  { value: "p1", label: "P1 - High" },
  { value: "p2", label: "P2 - Medium" },
  { value: "p3", label: "P3 - Low" },
];

export default function TaskFormModal({ task, projectId, onClose, onSaved }: TaskFormModalProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "p2");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [labels, setLabels] = useState(task?.labels?.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const toast = useToast();

  const isDirty =
    title !== (task?.title ?? "") ||
    description !== (task?.description ?? "") ||
    priority !== (task?.priority ?? "p2") ||
    dueDate !== (task?.dueDate ?? "") ||
    labels !== (task?.labels?.join(", ") ?? "");

  function handleClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setSaving(true);

    const parsedLabels = labels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      if (isEdit) {
        await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            priority,
            dueDate: dueDate || null,
            labels: parsedLabels,
          }),
        });
      } else {
        await fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            priority,
            dueDate: dueDate || null,
            labels: parsedLabels,
          }),
        });
        toast("success", `Created "${title}"`);
      }
      onSaved();
      onClose();
    } catch {
      toast("error", `Failed to ${isEdit ? "update" : "create"} task`);
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={handleClose}
      ariaLabel={isEdit ? "Edit Task" : "New Task"}
      preventBackdropClose={isDirty}
      onBackdropClick={() => setShowDiscardConfirm(true)}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md animate-scale-in space-y-4 rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-studio-100">{isEdit ? "Edit Task" : "New Task"}</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-studio-400">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(false);
            }}
            className={titleError ? "!border-accent-red" : ""}
            placeholder="Task title"
            autoFocus
          />
          {titleError && <p className="mt-1 text-xs text-accent-red">Title is required</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-studio-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-studio-400">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-studio-400">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-studio-400">Labels (comma-separated)</label>
          <input
            type="text"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            placeholder="e.g. frontend, urgent"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-badge bg-accent-blue px-4 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Create"}
          </button>
        </div>
      </form>
      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard Changes"
          message="You have unsaved changes. Discard them?"
          confirmLabel="Discard"
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </Modal>
  );
}
