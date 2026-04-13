import { deckPages, DeckPage, DeckControl } from "@/app/setup/deckConfig";

const INSTANCE_ID = "projmgr";

// Map deckConfig page IDs to Companion page numbers
const PAGE_NUMBER: Record<string, number> = {
  projects: 1,
  tasks: 2,
  lights: 3,
};

// Map deckConfig page labels to page numbers for nav targets
const PAGE_NAV_TARGET: Record<string, number> = {
  PROJECTS: 1,
  TASKS: 2,
  LIGHTS: 3,
};

/** Button position (1-8) to grid row/col on Stream Deck+ (4x2 button grid) */
function buttonPosition(pos: number): { row: number; col: number } {
  // Positions 1-4 → row 0, cols 0-3
  // Positions 5-8 → row 1, cols 0-3
  return {
    row: pos <= 4 ? 0 : 1,
    col: (pos - 1) % 4,
  };
}

/** Dial position (1-4) to grid row 3, cols 0-3 */
function dialColumn(pos: number): number {
  return pos - 1;
}

let actionCounter = 0;
function nextId(): string {
  return `act-${++actionCounter}`;
}

function makeHttpAction(control: DeckControl, actionType: "post" | "get"): CompanionAction {
  const opts: Record<string, unknown> = {
    url: control.url ?? "",
    header: "",
    contenttype: "application/json",
    jsonResultDataVariable: "",
    result_stringify: true,
    statusCodeVariable: "",
  };
  if (actionType !== "get") {
    opts.body = control.body ? JSON.stringify(control.body) : "{}";
  }
  return {
    id: nextId(),
    instance: INSTANCE_ID,
    action: actionType,
    options: opts,
  };
}

function makeLcdRefreshAction(lcdKey: string): CompanionAction {
  return {
    id: nextId(),
    instance: INSTANCE_ID,
    action: "get",
    options: {
      url: `/api/deck/lcd?key=${lcdKey}`,
      header: "",
      contenttype: "application/json",
      jsonResultDataVariable: `lcd_${lcdKey}`,
      result_stringify: false,
      statusCodeVariable: "",
    },
  };
}

function makePageNavAction(pageNavTarget: string): CompanionAction {
  return {
    id: nextId(),
    instance: "internal",
    action: "set_page",
    options: {
      page: PAGE_NAV_TARGET[pageNavTarget] ?? 1,
      controller: "self",
    },
  };
}

const DEFAULT_STYLE = {
  textExpression: false,
  size: "auto" as const,
  png64: null,
  alignment: "center:center",
  pngalignment: "center:center",
  color: 16777215, // white
  bgcolor: 0, // black
  show_topbar: "default" as const,
};

function makeButtonControl(control: DeckControl): CompanionControl {
  const downActions: CompanionAction[] = [];

  if (control.isPageNav && control.pageNavTarget) {
    downActions.push(makePageNavAction(control.pageNavTarget));
  }
  if (control.method && control.url) {
    downActions.push(makeHttpAction(control, control.method.toLowerCase() as "post" | "get"));
  }

  // Append LCD refresh actions for page-nav buttons
  if (control.lcdRefreshKeys) {
    for (const key of control.lcdRefreshKeys) {
      downActions.push(makeLcdRefreshAction(key));
    }
  }

  return {
    type: "button",
    options: { rotaryActions: false, stepAutoProgress: true },
    style: {
      text: control.label.replace(/ /g, "\\n") || "",
      ...DEFAULT_STYLE,
    },
    feedbacks: [],
    steps: {
      "0": {
        action_sets: {
          down: downActions,
          up: [],
        },
        options: { runWhileHeld: [] },
      },
    },
  };
}

function makeDialControl(dialControls: DeckControl[]): CompanionControl | null {
  const press = dialControls.find((d) => d.type === "dial-press");
  const left = dialControls.find((d) => d.type === "dial-turn-left");
  const right = dialControls.find((d) => d.type === "dial-turn-right");

  // Skip empty dials (no actions configured at all)
  const hasAnyAction = (press?.method && press?.url) || (left?.method && left?.url) || (right?.method && right?.url);
  if (!hasAnyAction && !press?.lcdKey) return null;

  const downActions: CompanionAction[] = [];
  if (press?.method && press?.url) {
    downActions.push(makeHttpAction(press, press.method.toLowerCase() as "post" | "get"));
  }

  const rotateLeft: CompanionAction[] = [];
  if (left?.method && left?.url) {
    rotateLeft.push(makeHttpAction(left, left.method.toLowerCase() as "post" | "get"));
  }

  const rotateRight: CompanionAction[] = [];
  if (right?.method && right?.url) {
    rotateRight.push(makeHttpAction(right, right.method.toLowerCase() as "post" | "get"));
  }

  // Collect all LCD keys to refresh for this dial
  const lcdKey = press?.lcdKey;
  const allLcdKeys: string[] = [];
  if (lcdKey) allLcdKeys.push(lcdKey);
  if (press?.lcdRefreshKeys) {
    for (const k of press.lcdRefreshKeys) {
      if (!allLcdKeys.includes(k)) allLcdKeys.push(k);
    }
  }

  // Append LCD refresh actions to all action sets
  for (const key of allLcdKeys) {
    const action = makeLcdRefreshAction(key);
    downActions.push(action);
  }
  for (const key of allLcdKeys) {
    rotateLeft.push(makeLcdRefreshAction(key));
  }
  for (const key of allLcdKeys) {
    rotateRight.push(makeLcdRefreshAction(key));
  }

  // Use expression text if this dial has an LCD key
  const style: Record<string, unknown> = lcdKey
    ? {
        text: `$(Studio Console:lcd_${lcdKey})`,
        textExpression: true,
        size: DEFAULT_STYLE.size,
        png64: DEFAULT_STYLE.png64,
        alignment: DEFAULT_STYLE.alignment,
        pngalignment: DEFAULT_STYLE.pngalignment,
        color: DEFAULT_STYLE.color,
        bgcolor: DEFAULT_STYLE.bgcolor,
        show_topbar: DEFAULT_STYLE.show_topbar,
      }
    : {
        text: press?.label?.replace(/ /g, "\\n") || "",
        ...DEFAULT_STYLE,
      };

  return {
    type: "button",
    options: { rotaryActions: true, stepAutoProgress: true },
    style,
    feedbacks: [],
    steps: {
      "0": {
        action_sets: {
          down: downActions,
          up: [],
          rotate_left: rotateLeft,
          rotate_right: rotateRight,
        },
        options: { runWhileHeld: [] },
      },
    },
  };
}

function buildPage(page: DeckPage): CompanionPage {
  const controls: Record<string, Record<string, CompanionControl>> = {};

  // Buttons → rows 0-1
  for (const btn of page.buttons) {
    // Skip empty buttons (no label, no action)
    if (!btn.label && !btn.method && !btn.isPageNav) continue;

    const { row, col } = buttonPosition(btn.position);
    if (!controls[row]) controls[row] = {};
    controls[row][col] = makeButtonControl(btn);
  }

  // Dials → row 3
  const dialPositions = Array.from(new Set(page.dials.map((d) => d.position)));
  for (const pos of dialPositions) {
    const dialGroup = page.dials.filter((d) => d.position === pos);
    const control = makeDialControl(dialGroup);
    if (control) {
      if (!controls["3"]) controls["3"] = {};
      controls["3"][dialColumn(pos)] = control;
    }
  }

  return {
    name: page.label,
    controls,
    gridSize: {
      minColumn: 0,
      maxColumn: 3,
      minRow: 0,
      maxRow: 3,
    },
  };
}

export function generateCompanionConfig(baseUrl: string): CompanionConfig {
  // Reset counter for deterministic output
  actionCounter = 0;

  const pages: Record<string, CompanionPage> = {};
  for (const page of deckPages) {
    const pageNum = PAGE_NUMBER[page.id] ?? 1;
    pages[pageNum] = buildPage(page);
  }

  return {
    version: 6,
    type: "full",
    pages,
    instances: {
      [INSTANCE_ID]: {
        label: "Studio Console",
        instance_type: "generic-http",
        config: {
          prefix: baseUrl,
          proxyAddress: "",
          rejectUnauthorized: true,
        },
        isFirstInit: false,
        lastUpgradeIndex: 0,
        enabled: true,
        sortOrder: 0,
      },
    },
  };
}

// Type definitions for the Companion config format (v6)

interface CompanionConfig {
  version: number;
  type: string;
  pages: Record<string, CompanionPage>;
  instances: Record<string, CompanionInstance>;
}

interface CompanionPage {
  name: string;
  controls: Record<string, Record<string, CompanionControl>>;
  gridSize: {
    minColumn: number;
    maxColumn: number;
    minRow: number;
    maxRow: number;
  };
}

interface CompanionControl {
  type: string;
  options: Record<string, unknown>;
  style: Record<string, unknown>;
  feedbacks: unknown[];
  steps: Record<string, CompanionStep>;
}

interface CompanionStep {
  action_sets: {
    down: CompanionAction[];
    up: CompanionAction[];
    rotate_left?: CompanionAction[];
    rotate_right?: CompanionAction[];
  };
  options: { runWhileHeld: unknown[] };
}

interface CompanionAction {
  id: string;
  instance: string;
  action: string;
  options: Record<string, unknown>;
}

interface CompanionInstance {
  label: string;
  instance_type: string;
  config: Record<string, unknown>;
  isFirstInit: boolean;
  lastUpgradeIndex: number;
  enabled: boolean;
  sortOrder: number;
}
