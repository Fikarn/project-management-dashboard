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
    <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
      <button
        onClick={testConnection}
        disabled={status === "loading"}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {status === "loading" ? "Testing..." : "Test Connection"}
      </button>
      {status !== "idle" && status !== "loading" && (
        <span className={`text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>{message}</span>
      )}
    </div>
  );
}
