"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import Toast from "./Toast";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    const timeout = type === "error" ? 6000 : 4000;
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      // Cap at 5 toasts — drop oldest
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeout);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div key={t.id} {...(t.type === "error" ? { role: "alert", "aria-live": "assertive" } : {})}>
            <Toast type={t.type} message={t.message} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
