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
      className={`pointer-events-auto cursor-pointer bg-gray-800 border border-gray-700 border-l-4 ${BORDER_COLOR[type]} rounded-lg px-4 py-3 shadow-lg animate-slide-in max-w-sm`}
    >
      <p className="text-sm text-gray-200">{message}</p>
    </div>
  );
}
