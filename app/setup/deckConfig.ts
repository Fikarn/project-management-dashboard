export type ControlType = "button" | "dial-press" | "dial-turn-right" | "dial-turn-left";

export interface DeckControl {
  id: string;
  type: ControlType;
  position: number;
  label: string;
  description: string;
  isPageNav?: boolean;
  pageNavTarget?: string;
  method?: "POST" | "GET";
  url?: string;
  body?: Record<string, string>;
}

export interface DeckPage {
  id: string;
  label: string;
  buttons: DeckControl[];
  dials: DeckControl[];
}

export const deckPages: DeckPage[] = [
  // ═══════════════════════════════════════════════════════════
  // PAGE 1: PROJECTS
  // ═══════════════════════════════════════════════════════════
  {
    id: "projects",
    label: "PROJECTS",
    buttons: [
      {
        id: "proj-btn-1",
        type: "button",
        position: 1,
        label: "All",
        description: "Set view filter to show all projects",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setFilter", value: "all" },
      },
      {
        id: "proj-btn-2",
        type: "button",
        position: 2,
        label: "To Do",
        description: "Filter to To Do column only",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setFilter", value: "todo" },
      },
      {
        id: "proj-btn-3",
        type: "button",
        position: 3,
        label: "In Prog",
        description: "Filter to In Progress column only",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setFilter", value: "in-progress" },
      },
      {
        id: "proj-btn-4",
        type: "button",
        position: 4,
        label: "TASKS >>",
        description: "Navigate to Tasks page",
        isPageNav: true,
        pageNavTarget: "TASKS",
      },
      {
        id: "proj-btn-5",
        type: "button",
        position: 5,
        label: "Blocked",
        description: "Filter to Blocked column only",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setFilter", value: "blocked" },
      },
      {
        id: "proj-btn-6",
        type: "button",
        position: 6,
        label: "Done",
        description: "Filter to Done column only",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setFilter", value: "done" },
      },
      {
        id: "proj-btn-7",
        type: "button",
        position: 7,
        label: "New Proj",
        description: "Create a new project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "createProject" },
      },
      {
        id: "proj-btn-8",
        type: "button",
        position: 8,
        label: "Delete",
        description: "Delete the currently selected project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "deleteProject" },
      },
    ],
    dials: [
      // Dial 1: Project navigation
      {
        id: "proj-dial-1-press",
        type: "dial-press",
        position: 1,
        label: "Project",
        description: "Press to open project detail",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "openDetail" },
      },
      {
        id: "proj-dial-1-left",
        type: "dial-turn-left",
        position: 1,
        label: "Prev Project",
        description: "Turn left to select previous project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "selectPrevProject" },
      },
      {
        id: "proj-dial-1-right",
        type: "dial-turn-right",
        position: 1,
        label: "Next Project",
        description: "Turn right to select next project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "selectNextProject" },
      },
      // Dial 2: Status
      {
        id: "proj-dial-2-press",
        type: "dial-press",
        position: 2,
        label: "Status",
        description: "Press to set status to In Progress",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setStatus", value: "in-progress" },
      },
      {
        id: "proj-dial-2-left",
        type: "dial-turn-left",
        position: 2,
        label: "Prev Status",
        description: "Turn left to cycle status backward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "prevStatus" },
      },
      {
        id: "proj-dial-2-right",
        type: "dial-turn-right",
        position: 2,
        label: "Next Status",
        description: "Turn right to cycle status forward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "nextStatus" },
      },
      // Dial 3: Priority
      {
        id: "proj-dial-3-press",
        type: "dial-press",
        position: 3,
        label: "Priority",
        description: "No action on press",
      },
      {
        id: "proj-dial-3-left",
        type: "dial-turn-left",
        position: 3,
        label: "Prev Priority",
        description: "Turn left to cycle priority backward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "prevPriority" },
      },
      {
        id: "proj-dial-3-right",
        type: "dial-turn-right",
        position: 3,
        label: "Next Priority",
        description: "Turn right to cycle priority forward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "nextPriority" },
      },
      // Dial 4: Sort
      {
        id: "proj-dial-4-press",
        type: "dial-press",
        position: 4,
        label: "Sort",
        description: "Press to reset sort to manual",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "resetSort" },
      },
      {
        id: "proj-dial-4-left",
        type: "dial-turn-left",
        position: 4,
        label: "Prev Sort",
        description: "Turn left to cycle sort backward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "prevSort" },
      },
      {
        id: "proj-dial-4-right",
        type: "dial-turn-right",
        position: 4,
        label: "Next Sort",
        description: "Turn right to cycle sort forward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "nextSort" },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // PAGE 2: TASKS
  // ═══════════════════════════════════════════════════════════
  {
    id: "tasks",
    label: "TASKS",
    buttons: [
      {
        id: "tasks-btn-1",
        type: "button",
        position: 1,
        label: "<< PROJ",
        description: "Navigate back to Projects page",
        isPageNav: true,
        pageNavTarget: "PROJECTS",
      },
      {
        id: "tasks-btn-2",
        type: "button",
        position: 2,
        label: "Timer",
        description: "Toggle timer on selected task",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "toggleTimer" },
      },
      {
        id: "tasks-btn-3",
        type: "button",
        position: 3,
        label: "Complete",
        description: "Toggle completion on selected task",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "toggleTaskComplete" },
      },
      {
        id: "tasks-btn-4",
        type: "button",
        position: 4,
        label: "In Prog",
        description: "Set project status to In Progress",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setStatus", value: "in-progress" },
      },
      {
        id: "tasks-btn-5",
        type: "button",
        position: 5,
        label: "To Do",
        description: "Set project status to To Do",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setStatus", value: "todo" },
      },
      {
        id: "tasks-btn-6",
        type: "button",
        position: 6,
        label: "Blocked",
        description: "Set project status to Blocked",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setStatus", value: "blocked" },
      },
      {
        id: "tasks-btn-7",
        type: "button",
        position: 7,
        label: "Done",
        description: "Set project status to Done",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setStatus", value: "done" },
      },
      {
        id: "tasks-btn-8",
        type: "button",
        position: 8,
        label: "New Proj",
        description: "Create a new project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "createProject" },
      },
    ],
    dials: [
      // Dial 1: Project navigation
      {
        id: "tasks-dial-1-press",
        type: "dial-press",
        position: 1,
        label: "Project",
        description: "Press to open project detail",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "openDetail" },
      },
      {
        id: "tasks-dial-1-left",
        type: "dial-turn-left",
        position: 1,
        label: "Prev Project",
        description: "Turn left to select previous project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "selectPrevProject" },
      },
      {
        id: "tasks-dial-1-right",
        type: "dial-turn-right",
        position: 1,
        label: "Next Project",
        description: "Turn right to select next project",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "selectNextProject" },
      },
      // Dial 2: Task navigation
      {
        id: "tasks-dial-2-press",
        type: "dial-press",
        position: 2,
        label: "Task",
        description: "Press to toggle timer on selected task",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "toggleTimer" },
      },
      {
        id: "tasks-dial-2-left",
        type: "dial-turn-left",
        position: 2,
        label: "Prev Task",
        description: "Turn left to select previous task",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "selectPrevTask" },
      },
      {
        id: "tasks-dial-2-right",
        type: "dial-turn-right",
        position: 2,
        label: "Next Task",
        description: "Turn right to select next task",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "selectNextTask" },
      },
      // Dial 3: Status
      {
        id: "tasks-dial-3-press",
        type: "dial-press",
        position: 3,
        label: "Status",
        description: "Press to set status to In Progress",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "setStatus", value: "in-progress" },
      },
      {
        id: "tasks-dial-3-left",
        type: "dial-turn-left",
        position: 3,
        label: "Prev Status",
        description: "Turn left to cycle status backward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "prevStatus" },
      },
      {
        id: "tasks-dial-3-right",
        type: "dial-turn-right",
        position: 3,
        label: "Next Status",
        description: "Turn right to cycle status forward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "nextStatus" },
      },
      // Dial 4: Priority
      {
        id: "tasks-dial-4-press",
        type: "dial-press",
        position: 4,
        label: "Priority",
        description: "Press to toggle task completion",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "toggleTaskComplete" },
      },
      {
        id: "tasks-dial-4-left",
        type: "dial-turn-left",
        position: 4,
        label: "Prev Priority",
        description: "Turn left to cycle priority backward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "prevPriority" },
      },
      {
        id: "tasks-dial-4-right",
        type: "dial-turn-right",
        position: 4,
        label: "Next Priority",
        description: "Turn right to cycle priority forward",
        method: "POST",
        url: "/api/deck/action",
        body: { action: "nextPriority" },
      },
    ],
  },
];

/** Get all interactions for a physical dial (press + turn left + turn right) */
export function getDialInteractions(page: DeckPage, dialPosition: number): DeckControl[] {
  return page.dials.filter((d) => d.position === dialPosition);
}

/** Get unique physical dial positions for a page */
export function getPhysicalDials(page: DeckPage): number[] {
  return Array.from(new Set(page.dials.map((d) => d.position))).sort((a, b) => a - b);
}
