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
    <div className="mx-auto min-h-screen max-w-7xl px-6 pb-8 pt-6">
      <div className="mb-6 rounded-[24px] border border-studio-700/80 bg-[radial-gradient(circle_at_top_left,_rgba(153,186,146,0.16),_transparent_34%),linear-gradient(180deg,_rgba(22,22,31,0.94),_rgba(10,10,15,0.98))] p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xxs font-semibold uppercase tracking-[0.22em] text-accent-blue/80">Studio Console</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-studio-50">Control surface setup</h1>
            <p className="mt-3 text-sm leading-6 text-studio-300">
              Commission Bitfocus Companion and Stream Deck+ so operators can trigger lighting, audio, and planning
              actions from dedicated hardware.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-studio-400 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            &larr; Back to Studio Console
          </Link>
        </div>
      </div>

      {/* Download Config */}
      <div className="mb-4 rounded-[20px] border border-studio-750/80 bg-studio-850/70 p-4 shadow-card">
        <h2 className="mb-1 text-sm font-semibold text-studio-100">Quick Setup</h2>
        <p className="mb-4 text-xs text-studio-400">
          Generate a ready-to-import Companion profile for this workstation before doing manual verification.
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
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
            download="studio-console.companionconfig"
            onClick={() => {
              setDownloadStatus("Downloaded!");
              setTimeout(() => setDownloadStatus(null), 3000);
            }}
            className="rounded-badge bg-accent-blue px-4 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            Download Companion Profile
          </a>
          {downloadStatus && (
            <span role="status" className="text-xs text-accent-green">
              {downloadStatus}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-studio-500">
          Import this file in Companion (Import/Export → Import) to configure both pages of buttons and dials
          automatically for this local console.
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
