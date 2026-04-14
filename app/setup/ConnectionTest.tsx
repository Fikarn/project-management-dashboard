"use client";

import { useState } from "react";

export default function ConnectionTest() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function testConnection() {
    setStatus("loading");
    try {
      const res = await fetch("/api/deck/context");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus("success");
      setMessage(`Connected — ${data.projectCount} project${data.projectCount !== 1 ? "s" : ""} available`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Connection failed");
    }
  }

  const statusLabel =
    status === "success"
      ? "Console reachable"
      : status === "error"
        ? "Probe failed"
        : status === "loading"
          ? "Testing"
          : "Not tested";
  const statusTone =
    status === "success"
      ? "text-accent-green"
      : status === "error"
        ? "text-red-400"
        : status === "loading"
          ? "text-accent-blue"
          : "text-studio-500";

  return (
    <section className="console-surface-soft px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="console-label">Connection Probe</div>
          <div className={`mt-1 text-sm font-semibold ${statusTone}`}>{statusLabel}</div>
          <div className="mt-1 text-xxs text-studio-500">
            Checks the local Companion action endpoint at `/api/deck/context`.
          </div>
        </div>

        <button
          type="button"
          onClick={testConnection}
          disabled={status === "loading"}
          className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-50"
        >
          {status === "loading" ? "Testing..." : "Run Probe"}
        </button>
      </div>

      {status !== "idle" ? (
        <div
          role="status"
          className={`mt-3 rounded-[14px] border px-3 py-2.5 text-xs leading-5 ${
            status === "success"
              ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-100/85"
              : status === "error"
                ? "bg-red-500/8 border-red-500/20 text-red-100/85"
                : "bg-accent-blue/8 border-accent-blue/20 text-accent-blue"
          }`}
        >
          {message || "Testing local connection..."}
        </div>
      ) : null}
    </section>
  );
}
