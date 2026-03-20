"use client";

import { useState } from "react";
import { DeckControl, DeckPage, getDialInteractions } from "./deckConfig";

interface DetailPanelProps {
  page: DeckPage;
  selectedControl: DeckControl | null;
  onTestResult: (controlId: string, result: "success" | "error") => void;
}

function ControlCard({
  control,
  baseUrl,
  onTestResult,
}: {
  control: DeckControl;
  baseUrl: string;
  onTestResult: (controlId: string, result: "success" | "error") => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"success" | "error" | null>(null);

  if (control.isPageNav) {
    return (
      <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 p-4">
        <p className="text-sm text-yellow-300">
          Use Companion&apos;s built-in <strong>Page Jump</strong> action to navigate to the{" "}
          <strong>{control.pageNavTarget}</strong> page. No HTTP request needed.
        </p>
      </div>
    );
  }

  if (!control.url) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <p className="text-sm text-gray-500">This slot is empty — no action configured.</p>
      </div>
    );
  }

  const fullUrl = `${baseUrl}${control.url}`;
  const bodyJson = control.body ? JSON.stringify(control.body, null, 2) : null;
  const curlCmd =
    control.method === "GET"
      ? `curl "${fullUrl}"`
      : `curl -X POST "${fullUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(control.body)}'`;

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  async function runTest() {
    setTesting(true);
    setTestStatus(null);
    try {
      const opts: RequestInit =
        control.method === "GET"
          ? {}
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(control.body),
            };
      const res = await fetch(control.url!, opts);
      const status = res.ok ? "success" : "error";
      setTestStatus(status);
      onTestResult(control.id, status);
    } catch {
      setTestStatus("error");
      onTestResult(control.id, "error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
      {/* Method + URL */}
      <div>
        <span className="text-xs uppercase tracking-wide text-gray-500">Request</span>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-bold ${
              control.method === "GET" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-blue-300"
            }`}
          >
            {control.method}
          </span>
          <code className="break-all font-mono text-sm text-gray-200">{fullUrl}</code>
        </div>
      </div>

      {/* Headers */}
      {control.method === "POST" && (
        <div>
          <span className="text-xs uppercase tracking-wide text-gray-500">Headers</span>
          <code className="mt-1 block font-mono text-xs text-gray-400">Content-Type: application/json</code>
        </div>
      )}

      {/* Body */}
      {bodyJson && (
        <div>
          <span className="text-xs uppercase tracking-wide text-gray-500">Body</span>
          <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 font-mono text-xs text-gray-300">{bodyJson}</pre>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <CopyButton label="Copy URL" text={fullUrl} copied={copied} onCopy={copyText} />
        {bodyJson && <CopyButton label="Copy Body" text={bodyJson} copied={copied} onCopy={copyText} />}
        <CopyButton label="Copy as curl" text={curlCmd} copied={copied} onCopy={copyText} />
        <button
          onClick={runTest}
          disabled={testing}
          className={`rounded border px-3 py-1 text-xs transition-colors ${
            testStatus === "success"
              ? "border-green-600 bg-green-900/20 text-green-400"
              : testStatus === "error"
                ? "border-red-600 bg-red-900/20 text-red-400"
                : "border-gray-600 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {testing ? "Testing..." : testStatus === "success" ? "✓ OK" : testStatus === "error" ? "✗ Failed" : "Test"}
        </button>
      </div>
    </div>
  );
}

function CopyButton({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  const isCopied = copied === label;
  return (
    <button
      onClick={() => onCopy(text, label)}
      className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-700"
    >
      {isCopied ? "Copied!" : label}
    </button>
  );
}

function typeBadge(type: DeckControl["type"]): string {
  switch (type) {
    case "button":
      return "Button";
    case "dial-press":
      return "Dial Press";
    case "dial-turn-right":
      return "Dial Turn Right";
    case "dial-turn-left":
      return "Dial Turn Left";
  }
}

export default function DetailPanel({ page, selectedControl, onTestResult }: DetailPanelProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  if (!selectedControl) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 p-8">
        <p className="text-sm text-gray-500">Click a button or dial to see its configuration.</p>
      </div>
    );
  }

  // If it's a dial, show all interactions for that physical dial
  const isDial = selectedControl.type.startsWith("dial-");
  const dialInteractions = isDial ? getDialInteractions(page, selectedControl.position) : [];
  const hasDialContent = dialInteractions.some((d) => d.label);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-white">{selectedControl.label || "Empty Slot"}</h3>
        <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
          {isDial ? `Dial ${selectedControl.position}` : `Button ${selectedControl.position}`}
        </span>
      </div>

      {selectedControl.description && <p className="text-sm text-gray-400">{selectedControl.description}</p>}

      {isDial && hasDialContent ? (
        <div className="space-y-3">
          {dialInteractions
            .filter((d) => d.label || d.url)
            .map((interaction) => (
              <div key={interaction.id}>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {typeBadge(interaction.type)}: {interaction.label}
                </h4>
                <ControlCard control={interaction} baseUrl={baseUrl} onTestResult={onTestResult} />
              </div>
            ))}
        </div>
      ) : (
        <ControlCard control={selectedControl} baseUrl={baseUrl} onTestResult={onTestResult} />
      )}
    </div>
  );
}
