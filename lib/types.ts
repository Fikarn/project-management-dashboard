export type ProjectStatus = "todo" | "in-progress" | "blocked" | "done";
export type ViewFilter = "all" | ProjectStatus;

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  lastUpdated: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  isRunning: boolean;
  totalSeconds: number;
  lastStarted: string | null;
}

export interface DB {
  projects: Project[];
  tasks: Task[];
}
