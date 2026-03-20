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
        className="w-full max-w-md space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">{isEdit ? "Edit Task" : "New Task"}</h2>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(false);
            }}
            className={`w-full rounded border bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none ${titleError ? "border-red-500" : "border-gray-600"}`}
            placeholder="Task title"
            autoFocus
          />
          {titleError && <p className="mt-1 text-xs text-red-400">Title is required</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Labels (comma-separated)</label>
          <input
            type="text"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            placeholder="e.g. frontend, urgent"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
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
