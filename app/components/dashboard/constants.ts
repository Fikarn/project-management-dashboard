"use client";

import { LayoutGrid, Lightbulb, Mic, type LucideIcon } from "lucide-react";
import type { DashboardView } from "@/lib/types";

export const UI_SCALES = [
  { label: "S", value: 1 },
  { label: "M", value: 1.15 },
  { label: "L", value: 1.3 },
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
    title: "Lighting takes priority on this workstation.",
    description: "Keep cue changes, fixture groups, DMX output, and spatial focus points within one surface.",
  },
  audio: {
    eyebrow: "Studio Audio",
    title: "Monitor the mix without leaving the console.",
    description: "Recall snapshots, adjust channels, and keep OSC connectivity visible during live productions.",
  },
  kanban: {
    eyebrow: "Production Planning",
    title: "Use the planning board as a support tool, not the main event.",
    description: "Track prep work, checklists, and handoffs while the control surfaces stay front and center.",
  },
};
