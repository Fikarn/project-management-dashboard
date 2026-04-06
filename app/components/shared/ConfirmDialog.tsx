"use client";

import { AlertTriangle } from "lucide-react";
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
        className="w-full max-w-sm animate-scale-in space-y-4 rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-full bg-red-500/10 p-3">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-studio-100">{title}</h2>
            <p className="mt-1 text-sm text-studio-400">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-badge bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
