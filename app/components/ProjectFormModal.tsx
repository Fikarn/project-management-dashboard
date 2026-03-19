"use client";

import { useState } from "react";
import type { Project, Priority, ProjectStatus } from "@/lib/types";
import { useToast } from "./ToastContext";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";

interface ProjectFormModalProps {
  project?: Project;
  defaultStatus?: ProjectStatus;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "p0", label: "P0 - Critical" },
  { value: "p1", label: "P1 - High" },
  { value: "p2", label: "P2 - Medium" },
  { value: "p3", label: "P3 - Low" },
];

export default function ProjectFormModal({
  project,
  defaultStatus,
  onClose,
  onSaved,
}: ProjectFormModalProps) {
  const isEdit = !!project;
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [priority, setPriority] = useState<Priority>(project?.priority ?? "p2");
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const toast = useToast();

  const isDirty = title !== (project?.title ?? "") || description !== (project?.description ?? "") || priority !== (project?.priority ?? "p2");

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

    try {
      if (isEdit) {
        await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, priority }),
        });
      } else {
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            priority,
            status: defaultStatus ?? "todo",
          }),
        });
        toast("success", `Created "${title}"`);
      }
      onSaved();
      onClose();
    } catch {
      toast("error", `Failed to ${isEdit ? "update" : "create"} project`);
      setSaving(false);
    }
  }

  return (
    <Modal onClose={handleClose} ariaLabel={isEdit ? "Edit Project" : "New Project"} preventBackdropClose={isDirty} onBackdropClick={() => setShowDiscardConfirm(true)}>
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">
          {isEdit ? "Edit Project" : "New Project"}
        </h2>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
            className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 ${titleError ? "border-red-500" : "border-gray-600"}`}
            placeholder="Project title"
            autoFocus
          />
          {titleError && <p className="text-xs text-red-400 mt-1">Title is required</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
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
