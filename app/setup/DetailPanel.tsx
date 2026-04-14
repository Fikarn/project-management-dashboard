"use client";

import { useMemo, useState } from "react";
import { DeckControl, DeckPage, getDialInteractions } from "./deckConfig";

interface DetailPanelProps {
  page: DeckPage;
  selectedControl: DeckControl | null;
  onTestResult: (controlId: string, result: "success" | "error") => void;
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
      className="rounded-badge border border-studio-700 bg-studio-950/45 px-3 py-1.5 text-xs text-studio-300 transition-colors hover:border-studio-600 hover:bg-studio-900 hover:text-studio-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
    >
      {isCopied ? "Copied" : label}
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
      return "Dial Right";
    case "dial-turn-left":
      return "Dial Left";
  }
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
      <div className="bg-amber-500/8 rounded-[16px] border border-amber-500/20 px-3 py-3">
        <div className="console-label text-amber-200/90">Companion Native Action</div>
        <p className="mt-1 text-sm leading-6 text-amber-100/85">
          Use Companion&apos;s built-in <strong>Page Jump</strong> action to navigate to{" "}
          <strong>{control.pageNavTarget}</strong>. No HTTP call is required for this slot.
        </p>
      </div>
    );
  }

  if (!control.url) {
    return (
      <div className="rounded-[16px] border border-studio-800 bg-studio-950/35 px-3 py-3">
        <div className="console-label">Empty Slot</div>
        <p className="mt-1 text-sm text-studio-400">No action is mapped here in the generated profile.</p>
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
      const requestInit: RequestInit =
        control.method === "GET"
          ? {}
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(control.body),
            };
      const res = await fetch(fullUrl, requestInit);
      const result = res.ok ? "success" : "error";
      setTestStatus(result);
      onTestResult(control.id, result);
    } catch {
      setTestStatus("error");
      onTestResult(control.id, "error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="console-label">Request</div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-pill px-2 py-0.5 text-xxs font-semibold uppercase tracking-[0.16em] ${
                control.method === "GET" ? "bg-emerald-500/12 text-emerald-300" : "bg-accent-blue/12 text-accent-blue"
              }`}
            >
              {control.method}
            </span>
            <span className="text-xs text-studio-500">{typeBadge(control.type)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={runTest}
          disabled={testing}
          className={`rounded-badge border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
            testStatus === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : testStatus === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-studio-700 bg-studio-900/70 text-studio-300 hover:border-studio-600 hover:text-studio-100"
          }`}
        >
          {testing ? "Testing..." : testStatus === "success" ? "OK" : testStatus === "error" ? "Failed" : "Test"}
        </button>
      </div>

      <div className="mt-3 rounded-[14px] border border-studio-800 bg-studio-950/55 px-3 py-2.5">
        <div className="console-label">Full URL</div>
        <code className="mt-1 block break-all font-mono text-xs leading-5 text-studio-200">{fullUrl}</code>
      </div>

      {bodyJson ? (
        <div className="mt-3 rounded-[14px] border border-studio-800 bg-studio-950/55 px-3 py-2.5">
          <div className="console-label">JSON Body</div>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-5 text-studio-300">
            {bodyJson}
          </pre>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton label="Copy URL" text={fullUrl} copied={copied} onCopy={copyText} />
        {bodyJson ? <CopyButton label="Copy Body" text={bodyJson} copied={copied} onCopy={copyText} /> : null}
        <CopyButton label="Copy curl" text={curlCmd} copied={copied} onCopy={copyText} />
      </div>
    </div>
  );
}

export default function DetailPanel({ page, selectedControl, onTestResult }: DetailPanelProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const selectedInteractions = useMemo(() => {
    if (!selectedControl) return [];
    if (selectedControl.type.startsWith("dial-")) {
      return getDialInteractions(page, selectedControl.position).filter(
        (interaction) => interaction.label || interaction.url
      );
    }
    return [selectedControl];
  }, [page, selectedControl]);

  const buttonInventory = page.buttons.filter((button) => button.label);
  const dialInventory = page.dials.filter((dial) => dial.type === "dial-press" && dial.label);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
        <div className="console-label">Detail Pane</div>
        <div className="mt-1 text-sm font-semibold text-studio-100">
          {selectedControl?.label || `${page.label} page overview`}
        </div>
        <div className="mt-1 text-xxs leading-5 text-studio-500">
          {selectedControl
            ? selectedControl.description || "Inspect, copy, and test this action from the commissioning console."
            : "Select a button or dial to inspect its exact Companion action, request path, and test result."}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1" tabIndex={0} aria-label="Selected control details">
        {selectedControl ? (
          <div className="space-y-3">
            {selectedInteractions.map((interaction) => (
              <div key={interaction.id}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-studio-500">
                  {typeBadge(interaction.type)}
                  {interaction.type.startsWith("dial-")
                    ? ` · Dial ${interaction.position}`
                    : ` · Button ${interaction.position}`}
                </div>
                <ControlCard control={interaction} baseUrl={baseUrl} onTestResult={onTestResult} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
              <div className="console-label">Mapped Buttons</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {buttonInventory.map((button) => (
                  <span
                    key={button.id}
                    className="rounded-pill border border-studio-700 bg-studio-950/55 px-2.5 py-1 text-xxs font-medium uppercase tracking-[0.14em] text-studio-300"
                  >
                    {button.position}: {button.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
              <div className="console-label">Dial Press Inventory</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {dialInventory.map((dial) => (
                  <span
                    key={dial.id}
                    className="rounded-pill border border-studio-700 bg-studio-950/55 px-2.5 py-1 text-xxs font-medium uppercase tracking-[0.14em] text-studio-300"
                  >
                    Dial {dial.position}: {dial.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-accent-blue/8 rounded-[16px] border border-accent-blue/20 px-3 py-3">
              <div className="console-label text-accent-blue/90">Commissioning Hint</div>
              <p className="mt-1 text-sm leading-6 text-studio-200">
                Start with the generated profile, then use this pane only for validation or exceptions. If a slot needs
                manual Companion work, copy the exact URL and payload from here rather than retyping it.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
