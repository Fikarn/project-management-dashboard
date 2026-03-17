export type ProjectStatus = "todo" | "in-progress" | "blocked" | "done";
export type ViewFilter = "all" | ProjectStatus;
export type Priority = "p0" | "p1" | "p2" | "p3";
export type SortOption = "manual" | "priority" | "date" | "name";

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

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
  isRunning: boolean;
  totalSeconds: number;
  lastStarted: string | null;
  completed: boolean;
  order: number;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  entityType: "project" | "task";
  entityId: string;
  action: string;
  detail: string;
}

export interface Settings {
  viewFilter: ViewFilter;
  sortBy: SortOption;
  selectedProjectId: string | null;
}

export interface DB {
  projects: Project[];
  tasks: Task[];
  activityLog: ActivityEntry[];
  settings: Settings;
}
