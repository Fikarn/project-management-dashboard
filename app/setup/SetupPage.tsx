"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, LayoutGrid, Radio, SlidersHorizontal } from "lucide-react";
import { DeckControl, deckPages, getDialInteractions } from "./deckConfig";
import StreamDeckReplica from "./StreamDeckReplica";
import DetailPanel from "./DetailPanel";
import SetupGuide from "./SetupGuide";
import ConnectionTest from "./ConnectionTest";

function GatekeeperHelp() {
  const [open, setOpen] = useState(false);

  return (
    <section className="console-surface-soft px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="console-label">Installer Recovery</div>
          <div className="mt-1 text-sm font-semibold text-studio-100">Gatekeeper / SmartScreen help</div>
        </div>
        <span className={`text-xs text-studio-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          &#9660;
        </span>
      </button>

      {open ? (
        <div className="mt-3 grid gap-3 text-xs leading-5 text-studio-400">
          <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
            <div className="font-medium text-studio-200">macOS</div>
            <p className="mt-1">
              If the app is blocked, right-click the app, choose <strong>Open</strong>, then confirm once. That clears
              Gatekeeper for future launches.
            </p>
          </div>
          <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
            <div className="font-medium text-studio-200">Windows</div>
            <p className="mt-1">
              If SmartScreen intervenes, choose <strong>More info</strong> then <strong>Run anyway</strong>.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function SetupPage() {
  const [activePageId, setActivePageId] = useState("projects");
  const [selectedControl, setSelectedControl] = useState<DeckControl | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const activePage = deckPages.find((page) => page.id === activePageId) ?? deckPages[0];
  const configuredButtons = activePage.buttons.filter((button) => button.label).length;
  const configuredDials = new Set(activePage.dials.filter((dial) => dial.label).map((dial) => dial.position)).size;
  const actionableControls = useMemo(
    () =>
      [
        ...activePage.buttons.filter((button) => button.label),
        ...activePage.dials.filter((dial) => dial.label && dial.type === "dial-press"),
      ].length,
    [activePage]
  );
  const selectedInteractionCount =
    selectedControl && selectedControl.type.startsWith("dial-")
      ? getDialInteractions(activePage, selectedControl.position).filter(
          (interaction) => interaction.label || interaction.url
        ).length
      : selectedControl
        ? 1
        : 0;

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
    <div className="h-screen overflow-hidden">
      <div className="mx-auto flex h-full max-w-[1720px] flex-col gap-3 px-4 py-4">
        <header className="console-surface-strong px-4 py-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="console-label text-accent-blue/80">Commissioning Workspace</div>
                <h1 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-studio-50">
                  Control surface setup
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-studio-300">
                  Commission Bitfocus Companion and Stream Deck+ as a fixed studio console. This workspace is tuned for
                  import-first setup, fast verification, and no-scroll use at 1920×1080.
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-badge border border-studio-700 bg-studio-900/65 px-3 py-2 text-sm text-studio-300 transition-colors hover:border-studio-600 hover:bg-studio-850 hover:text-studio-100"
              >
                <ArrowLeft size={14} />
                Back to Console
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-3">
              <div className="console-stat-card">
                <div className="console-label">Deck Pages</div>
                <div className="console-stat-value">{deckPages.length}</div>
                <div className="mt-1 text-xxs text-studio-500">Projects / Tasks / Lights / Audio</div>
              </div>
              <div className="console-stat-card">
                <div className="console-label">Active Page</div>
                <div className="console-stat-value">{activePage.label}</div>
                <div className="mt-1 text-xxs text-studio-500">
                  {configuredButtons} buttons, {configuredDials} dials mapped
                </div>
              </div>
              <div className="bg-emerald-500/8 rounded-[16px] border border-emerald-500/20 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="console-label text-emerald-200/90">Workflow</div>
                <div className="mt-1 text-lg font-semibold leading-none tracking-tight text-emerald-100">
                  Import first
                </div>
                <div className="mt-1 text-xxs text-emerald-100/70">
                  Profile download, action test, then manual exceptions
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[320px_minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <aside className="console-surface min-h-0 overflow-hidden px-3 py-3">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <section className="console-surface-soft px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="console-label">Quick Setup</div>
                    <div className="mt-1 text-sm font-semibold text-studio-100">Generate Companion profile</div>
                    <div className="mt-1 text-xxs leading-5 text-studio-500">
                      Export a ready-to-import profile for this workstation before manual edits.
                    </div>
                  </div>
                  <span className="rounded-pill bg-accent-blue/10 px-2 py-0.5 text-xxs font-semibold uppercase tracking-[0.16em] text-accent-blue">
                    Recommended
                  </span>
                </div>

                <div className="mt-3 grid gap-3">
                  <div>
                    <label htmlFor="setup-base-url" className="mb-1 block text-xs text-studio-400">
                      Server Base URL
                    </label>
                    <input
                      id="setup-base-url"
                      type="text"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      placeholder="http://localhost:3000"
                      className="w-full"
                    />
                  </div>

                  <a
                    href={`/api/companion-config?baseUrl=${encodeURIComponent(baseUrl)}`}
                    download="studio-console.companionconfig"
                    onClick={() => {
                      setDownloadStatus("Profile downloaded");
                      setTimeout(() => setDownloadStatus(null), 3000);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                  >
                    <Download size={15} />
                    Download Companion Profile
                  </a>

                  <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5 text-xxs leading-5 text-studio-400">
                    Import in Companion from <span className="font-medium text-studio-200">Import/Export → Import</span>
                    . This includes both button pages and dial behavior for the local console.
                  </div>

                  {downloadStatus ? (
                    <div role="status" className="text-xs font-medium text-accent-green">
                      {downloadStatus}
                    </div>
                  ) : null}
                </div>
              </section>

              <div
                className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
                tabIndex={0}
                aria-label="Setup guidance and support panels"
              >
                <ConnectionTest />
                <SetupGuide />
                <GatekeeperHelp />
              </div>
            </div>
          </aside>

          <section className="console-surface flex min-h-0 flex-col overflow-hidden px-3 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="console-label">Deck Layout</div>
                <div className="mt-1 text-sm font-semibold text-studio-100">Stream Deck+ replica</div>
                <div className="mt-1 text-xxs text-studio-500">
                  Select a page, then inspect buttons and dial press actions exactly as the operator will see them.
                </div>
              </div>
              <div className="grid gap-2 text-right">
                <div className="console-stat-card">
                  <div className="console-label">Mapped Slots</div>
                  <div className="mt-1 text-sm font-semibold text-studio-100">{actionableControls}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Stream Deck pages">
              {deckPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  role="tab"
                  aria-selected={activePageId === page.id}
                  onClick={() => handlePageChange(page.id)}
                  className={`rounded-badge border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                    activePageId === page.id
                      ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                      : "border-studio-700 bg-studio-950/45 text-studio-400 hover:border-studio-600 hover:text-studio-200"
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1">
              <StreamDeckReplica
                page={activePage}
                selectedControlId={selectedControl?.id ?? null}
                onSelectControl={handleSelectControl}
                testResults={testResults}
              />
            </div>
          </section>

          <section className="console-surface flex min-h-0 flex-col overflow-hidden px-3 py-3">
            <div className="grid min-h-0 flex-1 gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
                  <div className="console-label">Selection</div>
                  <div className="mt-1 text-sm font-semibold text-studio-100">
                    {selectedControl?.label || "No slot selected"}
                  </div>
                  <div className="mt-1 text-xxs text-studio-500">
                    {selectedControl
                      ? `${selectedControl.type.startsWith("dial-") ? "Dial" : "Button"} ${selectedControl.position}`
                      : "Choose a control to inspect"}
                  </div>
                </div>
                <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
                  <div className="console-label">Interaction Set</div>
                  <div className="mt-1 text-sm font-semibold text-studio-100">{selectedInteractionCount || "—"}</div>
                  <div className="mt-1 text-xxs text-studio-500">Press action or full dial interaction group</div>
                </div>
                <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-3">
                  <div className="console-label">Page Role</div>
                  <div className="mt-1 text-sm font-semibold text-studio-100">{activePage.label}</div>
                  <div className="mt-1 text-xxs text-studio-500">Mapped for fixed workstation use</div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
                <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xxs text-studio-500">
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutGrid size={13} />
                      Button action pages
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <SlidersHorizontal size={13} />
                      Dial press details and API payloads
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Radio size={13} />
                      Built-in live test support
                    </span>
                  </div>
                </div>

                <div className="min-h-0 overflow-hidden">
                  <DetailPanel page={activePage} selectedControl={selectedControl} onTestResult={handleTestResult} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
