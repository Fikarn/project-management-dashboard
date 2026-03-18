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
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
        <p className="text-yellow-300 text-sm">
          Use Companion&apos;s built-in <strong>Page Jump</strong> action to navigate to the{" "}
          <strong>{control.pageNavTarget}</strong> page. No HTTP request needed.
        </p>
      </div>
    );
  }

  if (!control.url) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-500 text-sm">This slot is empty — no action configured.</p>
      </div>
    );
  }

  const fullUrl = `${baseUrl}${control.url}`;
  const bodyJson = control.body ? JSON.stringify(control.body, null, 2) : null;
  const curlCmd = control.method === "GET"
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
      const opts: RequestInit = control.method === "GET"
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      {/* Method + URL */}
      <div>
        <span className="text-xs text-gray-500 uppercase tracking-wide">Request</span>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            control.method === "GET" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-blue-300"
          }`}>
            {control.method}
          </span>
          <code className="text-sm text-gray-200 font-mono break-all">{fullUrl}</code>
        </div>
      </div>

      {/* Headers */}
      {control.method === "POST" && (
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Headers</span>
          <code className="block mt-1 text-xs text-gray-400 font-mono">
            Content-Type: application/json
          </code>
        </div>
      )}

      {/* Body */}
      {bodyJson && (
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Body</span>
          <pre className="mt-1 text-xs text-gray-300 font-mono bg-gray-900 rounded p-3 overflow-x-auto">
            {bodyJson}
          </pre>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <CopyButton label="Copy URL" text={fullUrl} copied={copied} onCopy={copyText} />
        {bodyJson && (
          <CopyButton label="Copy Body" text={bodyJson} copied={copied} onCopy={copyText} />
        )}
        <CopyButton label="Copy as curl" text={curlCmd} copied={copied} onCopy={copyText} />
        <button
          onClick={runTest}
          disabled={testing}
          className={`px-3 py-1 text-xs rounded border transition-colors ${
            testStatus === "success"
              ? "border-green-600 text-green-400 bg-green-900/20"
              : testStatus === "error"
              ? "border-red-600 text-red-400 bg-red-900/20"
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
      className="px-3 py-1 text-xs rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
    >
      {isCopied ? "Copied!" : label}
    </button>
  );
}

function typeBadge(type: DeckControl["type"]): string {
  switch (type) {
    case "button": return "Button";
    case "dial-press": return "Dial Press";
    case "dial-turn-right": return "Dial Turn Right";
    case "dial-turn-left": return "Dial Turn Left";
  }
}

export default function DetailPanel({ page, selectedControl, onTestResult }: DetailPanelProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  if (!selectedControl) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 text-sm">Click a button or dial to see its configuration.</p>
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
        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
          {isDial ? `Dial ${selectedControl.position}` : `Button ${selectedControl.position}`}
        </span>
      </div>

      {selectedControl.description && (
        <p className="text-sm text-gray-400">{selectedControl.description}</p>
      )}

      {isDial && hasDialContent ? (
        <div className="space-y-3">
          {dialInteractions
            .filter((d) => d.label || d.url)
            .map((interaction) => (
              <div key={interaction.id}>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
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
