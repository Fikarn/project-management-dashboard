"use client";

import Link from "next/link";
import { Gauge, HelpCircle, Monitor, ZoomIn } from "lucide-react";
import type { DashboardView } from "@/lib/types";
import { useDashboardData } from "../shared/DashboardDataContext";
import { useDashboardUI } from "../shared/DashboardUIContext";
import SystemHealthStrip from "../shared/SystemHealthStrip";
import { DASHBOARD_VIEW_COPY, DASHBOARD_VIEW_OPTIONS, UI_SCALES } from "./constants";

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="console-stat-card flex min-h-[82px] flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="console-label">{label}</span>
        <Gauge size={14} className="text-studio-600" aria-hidden="true" />
      </div>
      <div className="text-[1.45rem] font-semibold leading-none tracking-tight text-studio-50">{value}</div>
    </div>
  );
}

function ViewTab({
  activeView,
  view,
  onSelect,
}: {
  activeView: DashboardView;
  view: (typeof DASHBOARD_VIEW_OPTIONS)[number];
  onSelect: (view: DashboardView) => void;
}) {
  const Icon = view.icon;
  const isActive = activeView === view.id;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-keyshortcuts={view.shortcut}
      onClick={() => onSelect(view.id)}
      className={`flex min-w-0 items-start gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
        isActive
          ? "border-accent-blue/35 bg-accent-blue/10 text-studio-50 shadow-card"
          : "border-studio-700/80 bg-studio-950/35 text-studio-300 hover:border-studio-600 hover:bg-studio-900/60"
      }`}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isActive ? "bg-accent-blue/15 text-accent-blue" : "bg-studio-800 text-studio-500"
        }`}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium">
          {view.label}
          <kbd className="rounded-badge border border-studio-700 bg-studio-900/70 px-1.5 py-0.5 font-mono text-xxs text-studio-500">
            {view.shortcut.toUpperCase()}
          </kbd>
        </span>
        <span className="mt-1 block text-xs leading-4 text-studio-500">{view.description}</span>
      </span>
    </button>
  );
}

export default function DashboardHeader() {
  const {
    dashboardView,
    lights,
    audioChannels,
    projects,
    connected,
    globalDmxStatus,
    globalOscStatus,
    lastSavedKey,
    handleViewChange,
  } = useDashboardData();
  const { uiScale, showShortcutHint, setShowShortcuts, setShowShortcutHint, handleScaleChange } = useDashboardUI();

  const copy = DASHBOARD_VIEW_COPY[dashboardView];

  return (
    <section className="console-surface-strong relative overflow-hidden px-4 py-3.5 xl:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.03),transparent_38%,transparent_68%,rgba(255,255,255,0.02))]" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xxs font-semibold uppercase tracking-[0.24em] text-studio-500">
              <span className="rounded-pill border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-accent-blue">
                Studio Console
              </span>
              <span className="hidden xl:inline">
                Permanent operator surface for lighting, audio, planning, and deck control
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <SystemHealthStrip
              sseStatus={connected}
              dmxStatus={globalDmxStatus}
              oscStatus={globalOscStatus}
              lastSavedKey={lastSavedKey}
            />

            <Link
              href="/setup"
              className="flex items-center gap-2 rounded-badge border border-studio-700 bg-studio-900/70 px-3 py-2 text-xs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:bg-studio-850 hover:text-studio-100"
            >
              <Monitor size={14} aria-hidden="true" />
              Control surface setup
            </Link>

            <div className="flex items-center rounded-badge border border-studio-700 bg-studio-900/70" title="UI scale">
              <ZoomIn size={12} className="ml-2 text-studio-500" aria-hidden="true" />
              {UI_SCALES.map((scale) => (
                <button
                  key={scale.label}
                  type="button"
                  onClick={() => handleScaleChange(scale.value)}
                  title={scale.title}
                  className={`px-2 py-2 text-xs transition-colors ${
                    uiScale === scale.value ? "font-medium text-accent-blue" : "text-studio-500 hover:text-studio-200"
                  }`}
                >
                  {scale.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowShortcuts(true);
                setShowShortcutHint(false);
              }}
              className={`rounded-badge border border-studio-700 bg-studio-900/70 p-2 text-studio-500 transition-colors hover:border-studio-600 hover:bg-studio-850 hover:text-studio-200 ${
                showShortcutHint ? "animate-pulse ring-2 ring-accent-blue/40" : ""
              }`}
              title="Keyboard shortcuts"
            >
              <HelpCircle size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(430px,0.7fr)]">
          <div className="console-surface-soft px-4 py-4">
            <p className="console-label text-accent-blue/80">{copy.eyebrow}</p>
            <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-[1.55rem] font-semibold leading-tight tracking-tight text-studio-50 xl:text-[1.8rem]">
                  {copy.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-5 text-studio-300">{copy.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CountCard label="Lights" value={lights.length} />
            <CountCard label="Audio" value={audioChannels.length} />
            <CountCard label="Projects" value={projects.length} />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Dashboard view"
          className="grid gap-2 rounded-[18px] border border-studio-700/80 bg-studio-950/30 p-2 md:grid-cols-3"
        >
          {DASHBOARD_VIEW_OPTIONS.map((view) => (
            <ViewTab key={view.id} activeView={dashboardView} view={view} onSelect={handleViewChange} />
          ))}
        </div>
      </div>
    </section>
  );
}
