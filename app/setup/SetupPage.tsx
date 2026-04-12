"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

function GatekeeperHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-card border border-studio-750 bg-studio-850/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium text-studio-300 transition-colors hover:text-studio-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        Having trouble opening the app?
        <span className={`text-studio-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          &#9660;
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-studio-750 px-4 pb-4 pt-3 text-xs text-studio-400">
          <div>
            <h4 className="mb-1 font-medium text-studio-300">macOS</h4>
            <p>
              If you see &ldquo;app is damaged&rdquo; or &ldquo;unidentified developer&rdquo;: Right-click the app
              &rarr; Open &rarr; click <strong>Open</strong> in the dialog. You only need to do this once.
            </p>
          </div>
          <div>
            <h4 className="mb-1 font-medium text-studio-300">Windows</h4>
            <p>
              If SmartScreen blocks the installer: Click <strong>More info</strong> &rarr; <strong>Run anyway</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
import { deckPages, DeckControl } from "./deckConfig";
import StreamDeckReplica from "./StreamDeckReplica";
import DetailPanel from "./DetailPanel";
import SetupGuide from "./SetupGuide";
import ConnectionTest from "./ConnectionTest";

export default function SetupPage() {
  const [activePageId, setActivePageId] = useState("projects");
  const [selectedControl, setSelectedControl] = useState<DeckControl | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const activePage = deckPages.find((p) => p.id === activePageId)!;

  const handleSelectControl = useCallback((control: DeckControl) => {
    setSelectedControl(control);
  }, []);

  const handleTestResult = useCallback((controlId: string, result: "success" | "error") => {
    setTestResults((prev) => ({ ...prev, [controlId]: result }));
  }, []);

  function handlePageChange(pageId: string) {
    setActivePageId(pageId);
    setSelectedControl(null);
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-studio-100">Stream Deck+ Setup</h1>
        <Link
          href="/"
          className="text-sm text-studio-400 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Download Config */}
      <div className="mb-4 rounded-card border border-studio-750 bg-studio-850/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-studio-100">Quick Setup — Download Companion Config</h2>
        <div className="flex items-end gap-3">
          <div className="max-w-xs flex-1">
            <label htmlFor="setup-base-url" className="mb-1 block text-xs text-studio-400">
              Server Base URL
            </label>
            <input
              id="setup-base-url"
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded border border-studio-600 bg-studio-900 px-3 py-1.5 text-sm text-studio-200 focus:border-accent-blue focus:outline-none"
              placeholder="http://localhost:3000"
            />
          </div>
          <a
            href={`/api/companion-config?baseUrl=${encodeURIComponent(baseUrl)}`}
            download="project-manager.companionconfig"
            onClick={() => {
              setDownloadStatus("Downloaded!");
              setTimeout(() => setDownloadStatus(null), 3000);
            }}
            className="rounded-badge bg-accent-blue px-4 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            Download Companion Config
          </a>
          {downloadStatus && (
            <span role="status" className="text-xs text-accent-green">
              {downloadStatus}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-studio-500">
          Import this file in Companion (Import/Export → Import) to configure both pages of buttons and dials
          automatically.
        </p>
      </div>

      {/* Guide + Connection Test */}
      <div className="mb-6 space-y-3">
        <SetupGuide />
        <ConnectionTest />
      </div>

      {/* Page Tabs */}
      <div className="mb-6 flex gap-1" role="tablist" aria-label="Stream Deck pages">
        {deckPages.map((page) => (
          <button
            key={page.id}
            type="button"
            role="tab"
            aria-selected={activePageId === page.id}
            onClick={() => handlePageChange(page.id)}
            className={`rounded-t-[10px] px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
              activePageId === page.id
                ? "border border-studio-750 border-b-studio-850 bg-studio-850 text-studio-100"
                : "border border-transparent bg-studio-900 text-studio-400 hover:text-studio-200"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StreamDeckReplica
          page={activePage}
          selectedControlId={selectedControl?.id ?? null}
          onSelectControl={handleSelectControl}
          testResults={testResults}
        />
        <DetailPanel page={activePage} selectedControl={selectedControl} onTestResult={handleTestResult} />
      </div>

      {/* Gatekeeper / SmartScreen troubleshooting */}
      <div className="mt-8">
        <GatekeeperHelp />
      </div>
    </div>
  );
}
