"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
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
  const timeoutIds = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Clear all timeouts on unmount
  useEffect(() => {
    const map = timeoutIds.current;
    return () => {
      map.forEach((tid) => clearTimeout(tid));
      map.clear();
    };
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    const timeout = type === "error" ? 6000 : 4000;
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      // Cap at 5 toasts — drop oldest
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
    const tid = setTimeout(() => {
      timeoutIds.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeout);
    timeoutIds.current.set(id, tid);
  }, []);

  const dismiss = useCallback((id: number) => {
    const tid = timeoutIds.current.get(id);
    if (tid) {
      clearTimeout(tid);
      timeoutIds.current.delete(id);
    }
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
