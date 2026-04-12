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
      <div className="rounded-card border border-accent-amber/50 bg-accent-amber/10 p-4">
        <p className="text-sm text-accent-amber">
          Use Companion&apos;s built-in <strong>Page Jump</strong> action to navigate to the{" "}
          <strong>{control.pageNavTarget}</strong> page. No HTTP request needed.
        </p>
      </div>
    );
  }

  if (!control.url) {
    return (
      <div className="rounded-card border border-studio-750 bg-studio-850 p-4">
        <p className="text-sm text-studio-400">This slot is empty — no action configured.</p>
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
    <div className="space-y-3 rounded-card border border-studio-750 bg-studio-850 p-4">
      {/* Method + URL */}
      <div>
        <span className="text-xs uppercase tracking-wide text-studio-400">Request</span>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`rounded-badge px-1.5 py-0.5 text-xs font-bold ${
              control.method === "GET" ? "bg-accent-green/20 text-accent-green" : "bg-accent-blue/20 text-accent-blue"
            }`}
          >
            {control.method}
          </span>
          <code className="break-all font-mono text-sm text-studio-200">{fullUrl}</code>
        </div>
      </div>

      {/* Headers */}
      {control.method === "POST" && (
        <div>
          <span className="text-xs uppercase tracking-wide text-studio-400">Headers</span>
          <code className="mt-1 block font-mono text-xs text-studio-400">Content-Type: application/json</code>
        </div>
      )}

      {/* Body */}
      {bodyJson && (
        <div>
          <span className="text-xs uppercase tracking-wide text-studio-400">Body</span>
          <pre className="mt-1 overflow-x-auto rounded-badge bg-studio-900 p-3 font-mono text-xs text-studio-300">
            {bodyJson}
          </pre>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <CopyButton label="Copy URL" text={fullUrl} copied={copied} onCopy={copyText} />
        {bodyJson && <CopyButton label="Copy Body" text={bodyJson} copied={copied} onCopy={copyText} />}
        <CopyButton label="Copy as curl" text={curlCmd} copied={copied} onCopy={copyText} />
        <button
          type="button"
          onClick={runTest}
          disabled={testing}
          className={`rounded-badge border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
            testStatus === "success"
              ? "border-accent-green/60 bg-accent-green/10 text-accent-green"
              : testStatus === "error"
                ? "border-red-500/60 bg-red-500/10 text-red-400"
                : "border-studio-600 text-studio-300 hover:bg-studio-750"
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
      type="button"
      onClick={() => onCopy(text, label)}
      className="rounded-badge border border-studio-600 px-3 py-1 text-xs text-studio-300 transition-colors hover:bg-studio-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
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
      <div className="flex min-h-[300px] items-center justify-center rounded-card border border-studio-750 bg-studio-850/50 p-8">
        <p className="text-sm text-studio-400">Click a button or dial to see its configuration.</p>
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
        <h3 className="text-lg font-semibold text-studio-100">{selectedControl.label || "Empty Slot"}</h3>
        <span className="rounded-badge bg-studio-750 px-2 py-0.5 text-xs text-studio-400">
          {isDial ? `Dial ${selectedControl.position}` : `Button ${selectedControl.position}`}
        </span>
      </div>

      {selectedControl.description && <p className="text-sm text-studio-400">{selectedControl.description}</p>}

      {isDial && hasDialContent ? (
        <div className="space-y-3">
          {dialInteractions
            .filter((d) => d.label || d.url)
            .map((interaction) => (
              <div key={interaction.id}>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-studio-400">
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
