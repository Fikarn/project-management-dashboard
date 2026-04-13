"use client";

import Link from "next/link";
import { HelpCircle, Monitor, ZoomIn } from "lucide-react";
import type { DashboardView } from "@/lib/types";
import { useDashboardData } from "../shared/DashboardDataContext";
import { useDashboardUI } from "../shared/DashboardUIContext";
import SystemHealthStrip from "../shared/SystemHealthStrip";
import { DASHBOARD_VIEW_COPY, DASHBOARD_VIEW_OPTIONS, UI_SCALES } from "./constants";

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-studio-700/80 bg-studio-950/55 px-3 py-2">
      <div className="text-lg font-semibold tracking-tight text-studio-50">{value}</div>
      <div className="text-xxs uppercase tracking-[0.2em] text-studio-500">{label}</div>
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
      className={`flex min-w-[170px] flex-1 items-start gap-3 rounded-[14px] border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
        isActive
          ? "border-accent-blue/40 bg-accent-blue/10 text-studio-50 shadow-card"
          : "border-studio-700/80 bg-studio-950/35 text-studio-300 hover:border-studio-600 hover:bg-studio-900/60"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
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
        <span className="mt-1 block text-xs text-studio-500">{view.description}</span>
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
    <section className="relative overflow-hidden rounded-[26px] border border-studio-700/80 bg-[radial-gradient(circle_at_top_left,_rgba(153,186,146,0.16),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(201,212,218,0.12),_transparent_32%),linear-gradient(180deg,_rgba(22,22,31,0.96),_rgba(10,10,15,0.98))] px-5 py-5 shadow-card">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.03),transparent_35%,transparent_65%,rgba(255,255,255,0.02))]" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xxs font-semibold uppercase tracking-[0.24em] text-studio-500">
              <span className="rounded-pill border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-accent-blue">
                Studio Console
              </span>
              <span>Lighting, audio, Stream Deck, and planning on one local workstation</span>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-[20px] border border-studio-700/80 bg-studio-950/45 p-5 shadow-card backdrop-blur">
                <p className="text-xxs font-semibold uppercase tracking-[0.22em] text-accent-blue/80">{copy.eyebrow}</p>
                <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-studio-50 md:text-[2rem]">
                  {copy.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-studio-300">{copy.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 xl:min-w-[270px] xl:grid-cols-1">
                <CountCard label="Lights" value={lights.length} />
                <CountCard label="Channels" value={audioChannels.length} />
                <CountCard label="Projects" value={projects.length} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:max-w-[420px] xl:justify-end">
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

        <div
          role="tablist"
          aria-label="Dashboard view"
          className="grid gap-3 rounded-[20px] border border-studio-700/80 bg-studio-950/30 p-3 md:grid-cols-3"
        >
          {DASHBOARD_VIEW_OPTIONS.map((view) => (
            <ViewTab key={view.id} activeView={dashboardView} view={view} onSelect={handleViewChange} />
          ))}
        </div>
      </div>
    </section>
  );
}
