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
      setMessage(`Connected — ${data.projectCount} project${data.projectCount !== 1 ? "s" : ""}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Connection failed");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-studio-750 bg-studio-850/50 px-4 py-3">
      <button
        type="button"
        onClick={testConnection}
        disabled={status === "loading"}
        className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-50"
      >
        {status === "loading" ? "Testing..." : "Test Connection"}
      </button>
      {status !== "idle" && status !== "loading" && (
        <span role="status" className={`text-sm ${status === "success" ? "text-accent-green" : "text-red-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
