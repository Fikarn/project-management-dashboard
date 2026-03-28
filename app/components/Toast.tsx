"use client";

import { CheckCircle, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

const BORDER_COLOR: Record<ToastType, string> = {
  success: "border-l-accent-green",
  error: "border-l-accent-red",
  info: "border-l-accent-blue",
};

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="flex-shrink-0 text-accent-green" />,
  error: <XCircle size={16} className="flex-shrink-0 text-accent-red" />,
  info: <Info size={16} className="flex-shrink-0 text-accent-blue" />,
};

interface ToastProps {
  type: ToastType;
  message: string;
  onDismiss: () => void;
}

export default function Toast({ type, message, onDismiss }: ToastProps) {
  return (
    <div
      onClick={onDismiss}
      className={`pointer-events-auto flex cursor-pointer items-center gap-2.5 border border-l-4 border-studio-700 bg-studio-850 ${BORDER_COLOR[type]} max-w-sm animate-slide-in rounded-card px-4 py-3 shadow-modal`}
    >
      {ICON[type]}
      <p className="text-sm text-studio-200">{message}</p>
    </div>
  );
}
