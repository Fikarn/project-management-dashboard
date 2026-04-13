"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useDashboardData } from "./DashboardDataContext";
import { useKanbanActions } from "./KanbanActionsContext";

interface DashboardUIContextValue {
  uiScale: number;
  showShortcuts: boolean;
  showShortcutHint: boolean;
  showSetupWizard: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutHint: (v: boolean) => void;
  setShowSetupWizard: (v: boolean) => void;
  handleScaleChange: (val: number) => void;
}

const DashboardUIContext = createContext<DashboardUIContextValue | null>(null);

export function useDashboardUI(): DashboardUIContextValue {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) throw new Error("useDashboardUI must be used within DashboardUIProvider");
  return ctx;
}

export function DashboardUIProvider({ children }: { children: React.ReactNode }) {
  const { initialLoadDone, hasCompletedSetup, projects, handleViewChange, handleFilterChange } = useDashboardData();
  const { openModal, handleExport } = useKanbanActions();

  const [uiScale, setUiScale] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Restore UI scale from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("uiScale");
    if (saved) {
      const val = parseFloat(saved);
      if ([1, 1.15, 1.3].includes(val)) {
        setUiScale(val);
        document.documentElement.style.setProperty("--ui-scale", String(val));
      }
    }
  }, []);

  const handleScaleChange = useCallback((val: number) => {
    setUiScale(val);
    localStorage.setItem("uiScale", String(val));
    document.documentElement.style.setProperty("--ui-scale", String(val));
  }, []);

  // Show setup wizard on first run
  useEffect(() => {
    if (initialLoadDone && !hasCompletedSetup && projects.length === 0 && !localStorage.getItem("hasSeenWelcome")) {
      setShowSetupWizard(true);
    }
  }, [initialLoadDone, hasCompletedSetup, projects.length]);

  // Shortcut hint timer
  useEffect(() => {
    if (!localStorage.getItem("hasSeenShortcutHint")) {
      setShowShortcutHint(true);
      const timer = setTimeout(() => {
        setShowShortcutHint(false);
        localStorage.setItem("hasSeenShortcutHint", "1");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if (isInput) return;

      switch (e.key) {
        case "n":
          e.preventDefault();
          openModal({ type: "createProject", defaultStatus: "todo" });
          break;
        case "s":
        case "/":
          e.preventDefault();
          document.getElementById("search-input")?.focus();
          break;
        case "1":
          e.preventDefault();
          handleFilterChange("todo");
          break;
        case "2":
          e.preventDefault();
          handleFilterChange("in-progress");
          break;
        case "3":
          e.preventDefault();
          handleFilterChange("blocked");
          break;
        case "4":
          e.preventDefault();
          handleFilterChange("done");
          break;
        case "0":
          e.preventDefault();
          handleFilterChange("all");
          break;
        case "r":
          e.preventDefault();
          openModal({ type: "timeReport" });
          break;
        case "e":
          e.preventDefault();
          handleExport();
          break;
        case "l":
          e.preventDefault();
          handleViewChange("lighting");
          break;
        case "a":
          e.preventDefault();
          handleViewChange("audio");
          break;
        case "k":
        case "p":
          e.preventDefault();
          handleViewChange("kanban");
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleViewChange, handleFilterChange, handleExport, openModal]);

  const value = useMemo(
    (): DashboardUIContextValue => ({
      uiScale,
      showShortcuts,
      showShortcutHint,
      showSetupWizard,
      setShowShortcuts,
      setShowShortcutHint,
      setShowSetupWizard,
      handleScaleChange,
    }),
    [uiScale, showShortcuts, showShortcutHint, showSetupWizard, handleScaleChange]
  );

  return <DashboardUIContext.Provider value={value}>{children}</DashboardUIContext.Provider>;
}
