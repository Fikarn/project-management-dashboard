"use client";

import { LayoutGrid, Lightbulb, Mic, type LucideIcon } from "lucide-react";
import type { DashboardView } from "@/lib/types";

export const UI_SCALES = [
  { label: "90", value: 0.9, title: "Dense operator view" },
  { label: "100", value: 1, title: "Standard operator view" },
  { label: "108", value: 1.08, title: "Relaxed operator view" },
] as const;

export interface DashboardViewOption {
  id: DashboardView;
  label: string;
  shortcut: string;
  description: string;
  icon: LucideIcon;
}

export const DASHBOARD_VIEW_OPTIONS: DashboardViewOption[] = [
  {
    id: "lighting",
    label: "Lights",
    shortcut: "l",
    description: "Live lighting levels, scenes, and DMX health",
    icon: Lightbulb,
  },
  {
    id: "audio",
    label: "Audio",
    shortcut: "a",
    description: "Mixer channels, routing snapshots, and OSC status",
    icon: Mic,
  },
  {
    id: "kanban",
    label: "Projects",
    shortcut: "k",
    description: "Run-of-show planning, tasks, timers, and prep notes",
    icon: LayoutGrid,
  },
];

export const DASHBOARD_VIEW_COPY: Record<
  DashboardView,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  lighting: {
    eyebrow: "Studio Control",
    title: "Lighting control stays front and center.",
    description: "Keep cue changes, fixture groups, DMX output, and spatial focus points inside one fixed console.",
  },
  audio: {
    eyebrow: "Studio Audio",
    title: "Monitor the mix without leaving the console.",
    description: "Recall snapshots, adjust channels, and keep OSC connectivity readable during live productions.",
  },
  kanban: {
    eyebrow: "Production Planning",
    title: "Planning stays visible without taking over the screen.",
    description: "Track prep, handoffs, and timing while lighting and audio remain the primary operator surfaces.",
  },
};
