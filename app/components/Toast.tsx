"use client";

type ToastType = "success" | "error" | "info";

const BORDER_COLOR: Record<ToastType, string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
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
      className={`pointer-events-auto cursor-pointer border border-l-4 border-gray-700 bg-gray-800 ${BORDER_COLOR[type]} animate-slide-in max-w-sm rounded-lg px-4 py-3 shadow-lg`}
    >
      <p className="text-sm text-gray-200">{message}</p>
    </div>
  );
}
