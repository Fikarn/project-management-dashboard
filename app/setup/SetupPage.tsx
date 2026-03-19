"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
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
    <div className="p-6 min-h-screen max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Stream Deck+ Setup</h1>
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Download Config */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Quick Setup — Download Companion Config</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs text-gray-400 mb-1">Server Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
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
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
          >
            Download Companion Config
          </a>
          {downloadStatus && (
            <span className="text-xs text-green-400">{downloadStatus}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Import this file in Companion (Import/Export → Import) to configure both pages of buttons and dials automatically.
        </p>
      </div>

      {/* Guide + Connection Test */}
      <div className="space-y-3 mb-6">
        <SetupGuide />
        <ConnectionTest />
      </div>

      {/* Page Tabs */}
      <div className="flex gap-1 mb-6">
        {deckPages.map((page) => (
          <button
            key={page.id}
            onClick={() => handlePageChange(page.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activePageId === page.id
                ? "bg-gray-800 text-white border border-gray-700 border-b-gray-800"
                : "bg-gray-900 text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StreamDeckReplica
          page={activePage}
          selectedControlId={selectedControl?.id ?? null}
          onSelectControl={handleSelectControl}
          testResults={testResults}
        />
        <DetailPanel
          page={activePage}
          selectedControl={selectedControl}
          onTestResult={handleTestResult}
        />
      </div>
    </div>
  );
}
