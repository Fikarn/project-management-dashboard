"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} ariaLabel={title}>
      <div
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500">
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
