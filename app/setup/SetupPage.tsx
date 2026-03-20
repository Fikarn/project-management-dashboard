"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

function GatekeeperHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium text-gray-300 hover:text-white"
      >
        Having trouble opening the app?
        <span className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}>&#9660;</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-700 px-4 pb-4 pt-3 text-xs text-gray-400">
          <div>
            <h4 className="mb-1 font-medium text-gray-300">macOS</h4>
            <p>
              If you see &ldquo;app is damaged&rdquo; or &ldquo;unidentified developer&rdquo;: Right-click the app
              &rarr; Open &rarr; click <strong>Open</strong> in the dialog. You only need to do this once.
            </p>
          </div>
          <div>
            <h4 className="mb-1 font-medium text-gray-300">Windows</h4>
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
        <h1 className="text-xl font-bold tracking-tight text-white">Stream Deck+ Setup</h1>
        <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-gray-200">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Download Config */}
      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Quick Setup — Download Companion Config</h2>
        <div className="flex items-end gap-3">
          <div className="max-w-xs flex-1">
            <label className="mb-1 block text-xs text-gray-400">Server Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
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
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Download Companion Config
          </a>
          {downloadStatus && <span className="text-xs text-green-400">{downloadStatus}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-500">
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
      <div className="mb-6 flex gap-1">
        {deckPages.map((page) => (
          <button
            key={page.id}
            onClick={() => handlePageChange(page.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activePageId === page.id
                ? "border border-gray-700 border-b-gray-800 bg-gray-800 text-white"
                : "border border-transparent bg-gray-900 text-gray-500 hover:text-gray-300"
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
