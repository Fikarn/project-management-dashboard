export type ProjectStatus = "todo" | "in-progress" | "blocked" | "done";
export type ViewFilter = "all" | ProjectStatus;
export type Priority = "p0" | "p1" | "p2" | "p3";
export type SortOption = "manual" | "priority" | "date" | "name";

// Light control types
export type LightType = "astra-bicolor" | "infinimat" | "infinibar-pb12";
export type ColorMode = "cct" | "rgb" | "hsi";
export type EffectType = "pulse" | "strobe" | "candle";
export type DeckMode = "project" | "light";
export type DashboardView = "kanban" | "lighting";

export interface LightEffect {
  type: EffectType;
  speed: number; // 1-10 (slow to fast)
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  createdAt: string;
  lastUpdated: string;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  isRunning: boolean;
  totalSeconds: number;
  lastStarted: string | null;
  completed: boolean;
  order: number;
  createdAt: string;
}

export interface Light {
  id: string;
  name: string;
  type: LightType;
  dmxStartAddress: number;
  intensity: number;
  cct: number;
  on: boolean;
  order: number;
  red: number;
  green: number;
  blue: number;
  colorMode: ColorMode;
  gmTint: number | null;
  groupId: string | null;
  effect: LightEffect | null;
}

export interface LightGroup {
  id: string;
  name: string;
  order: number;
}

export interface LightScene {
  id: string;
  name: string;
  lightStates: LightSceneEntry[];
  createdAt: string;
  order: number;
}

export interface LightSceneEntry {
  lightId: string;
  intensity: number;
  cct: number;
  on: boolean;
  red: number;
  green: number;
  blue: number;
  colorMode: ColorMode;
  gmTint: number | null;
}

export interface LightingSettings {
  apolloBridgeIp: string;
  dmxUniverse: number;
  dmxEnabled: boolean;
  selectedLightId: string | null;
  selectedSceneId: string | null;
  grandMaster: number; // 0-100, global intensity multiplier
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  entityType: "project" | "task" | "light" | "scene";
  entityId: string;
  action: string;
  detail: string;
}

export interface Settings {
  viewFilter: ViewFilter;
  sortBy: SortOption;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  dashboardView: DashboardView;
  deckMode: DeckMode;
  hasCompletedSetup: boolean;
}

export interface DB {
  schemaVersion: number;
  projects: Project[];
  tasks: Task[];
  activityLog: ActivityEntry[];
  settings: Settings;
  lights: Light[];
  lightGroups: LightGroup[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
}
