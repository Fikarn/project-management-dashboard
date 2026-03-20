# Project Management Dashboard

Local Kanban dashboard for a secondary monitor. Fully interactive in the browser and controllable via Stream Deck+ through Bitfocus Companion. Ships as a standalone desktop app for macOS and Windows. UI reflects changes instantly via SSE — no manual refresh.

## Download

Grab the latest release for your platform from [**GitHub Releases**](https://github.com/Fikarn/project-management-dashboard/releases/latest):

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `Project Manager-*.dmg` | Open DMG, drag to Applications. First launch: right-click → Open to bypass Gatekeeper. |
| Windows (x64) | `Project Manager Setup *.exe` | NSIS installer. SmartScreen may warn on first launch — click "More info" → "Run anyway". |

The app runs a local server on port 3000 and stores data in the OS-standard app data directory. No account, no cloud — everything stays on your machine.

## Prerequisites

- Node.js 20 (see `.nvmrc`)

## Development Setup

```bash
npm install
npm run seed    # creates data/db.json with sample projects/tasks
npm run dev     # starts on http://localhost:3000
```

### Desktop App (Electron)

```bash
npm run electron:build      # Next.js build + Electron compile
npm run electron:dev        # Run in Electron (requires build first)
npm run electron:dev:open   # Fast: opens Electron pointing at dev server (no build)
npm run electron:dist       # Full distributable for current platform
npm run electron:dist:mac   # macOS DMG (arm64)
npm run electron:dist:win   # Windows NSIS installer (x64)
```

### Code Quality

```bash
npm run lint            # ESLint (Next.js rules)
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier format all files
npm run format:check    # Prettier check (CI)
```

Pre-commit hooks (Husky + lint-staged) auto-format and lint staged files.

### Testing

```bash
npm test                # Unit + API tests (Vitest)
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:e2e        # E2E tests (Playwright, starts dev server)
npm run test:e2e:ui     # E2E with Playwright UI
npm run test:all        # Unit + E2E
```

## Features

- **Kanban board** with 4 columns (To Do, In Progress, Blocked, Done)
- **Drag-and-drop** projects between columns and reorder within columns
- **Full CRUD** — create, edit, delete projects and tasks from the UI
- **Priority levels** (P0–P3) with color-coded badges
- **Task timers** with start/stop/toggle and accumulated time tracking
- **Due dates** with overdue/today/soon visual indicators
- **Progress bars** showing completed tasks per project
- **Search** across project titles, task titles, descriptions, and labels
- **Sort** by manual order, priority, date, or name
- **Activity log** tracking all changes
- **Keyboard shortcuts** (press `?` to see them, hint pulse on first visit)
- **Project detail modal** with tasks, progress, and activity
- **Stream Deck+ integration** via a context-aware action API
- **Real-time SSE** with auto-reconnect and exponential backoff
- **Atomic writes** — data file is never partially written
- **Auto-backups** every 30 minutes with automatic corruption recovery
- **Timer crash recovery** — running timers survive unexpected shutdowns
- **DMX blackout on quit** — lights gracefully turn off when closing
- **Splash screen** — Electron shows a loading screen during startup
- **Window state persistence** — remembers size, position, and maximized state
- **Accessible modals** with focus trapping, ARIA attributes, and keyboard navigation
- **Unsaved changes warning** on form modals
- **Toast notifications** with accessibility, stacking limit, and error-specific timeouts
- **Error and 404 pages** matching the dark theme

## API Reference

### Core CRUD

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | — | All projects, tasks, and settings |
| POST | `/api/projects` | `{title, description?, priority?, status?}` | Create project |
| PUT | `/api/projects/:id` | `{title?, description?, priority?}` | Update project |
| DELETE | `/api/projects/:id` | — | Delete project and its tasks |
| POST | `/api/projects/:id/status` | `{status}` | Set project status |
| POST | `/api/projects/:id/status/next` | — | Cycle to next status |
| POST | `/api/projects/reorder` | `{projectId, newStatus, newIndex}` | Move/reorder project |
| POST | `/api/projects/:id/tasks` | `{title, description?, priority?, dueDate?, labels?}` | Create task |
| PUT | `/api/projects/:id/tasks/:taskId` | `{title?, description?, priority?, dueDate?, labels?, completed?}` | Update task |
| DELETE | `/api/projects/:id/tasks/:taskId` | — | Delete task |
| POST | `/api/projects/:id/tasks/:taskId/timer` | `{action: "start"\|"stop"\|"toggle"}` | Control task timer |
| POST | `/api/projects/:id/tasks/:taskId/toggle` | — | Toggle task completed |

### Settings & Utility

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | — | Current settings |
| POST | `/api/settings` | `{viewFilter?, sortBy?, selectedProjectId?}` | Update settings |
| POST | `/api/view` | `{filter}` | Set view filter (legacy, use settings) |
| GET | `/api/events` | — | SSE stream |
| GET | `/api/activity?limit=50` | — | Recent activity log |
| POST | `/api/lights/shutdown` | — | DMX blackout + close sACN sender |

### Stream Deck Context API

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/deck/action` | `{action, value?}` | Execute action on selected project/task |
| POST | `/api/deck/select` | `{direction: "next"\|"prev"}` or `{projectId}` | Cycle or set project selection |
| GET | `/api/deck/context` | — | Current selection state for Companion polling |

All routes return `Access-Control-Allow-Origin: *`.

## Stream Deck+ Setup with Bitfocus Companion

### Prerequisites

1. Download and install [Bitfocus Companion](https://bitfocus.io/companion)
2. Connect your Stream Deck+ in Companion's settings
3. Ensure the dashboard is running on `http://localhost:3000`

### Concept: Context-Aware Actions

Rather than mapping each project to a fixed button (which doesn't scale), the deck uses a **server-side selection context**. Rotary dials cycle through projects/tasks, and buttons act on whatever is currently selected. All buttons POST to a single URL (`/api/deck/action`) with a static JSON body.

### Companion Configuration

For every button below, create an HTTP action in Companion:
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/deck/action`
- **Header:** `Content-Type: application/json`
- **Body:** as shown in the table

### Page: MAIN

| Control | Label | Body |
|---------|-------|------|
| Btn 1 | View All | `{"action":"setFilter","value":"all"}` |
| Btn 2 | To Do | `{"action":"setFilter","value":"todo"}` |
| Btn 3 | In Progress | `{"action":"setFilter","value":"in-progress"}` |
| Btn 4 | Blocked | `{"action":"setFilter","value":"blocked"}` |
| Btn 5 | Done | `{"action":"setFilter","value":"done"}` |
| Btn 6 | New Project | `{"action":"createProject"}` |
| Btn 7 | → STATUS | *(Companion page nav)* |
| Btn 8 | → TASKS | *(Companion page nav)* |
| Dial 1 turn R | Next Project | `{"action":"selectNextProject"}` |
| Dial 1 turn L | Prev Project | `{"action":"selectPrevProject"}` |
| Dial 1 press | Open Detail | `{"action":"openDetail"}` |
| Dial 2 turn R | Next Priority | `{"action":"nextPriority"}` |

### Page: STATUS (selected project)

| Control | Label | Body |
|---------|-------|------|
| Btn 1 | Set To Do | `{"action":"setStatus","value":"todo"}` |
| Btn 2 | Set In Progress | `{"action":"setStatus","value":"in-progress"}` |
| Btn 3 | Set Blocked | `{"action":"setStatus","value":"blocked"}` |
| Btn 4 | Set Done | `{"action":"setStatus","value":"done"}` |
| Btn 5 | Cycle Status | `{"action":"nextStatus"}` |
| Btn 6 | Priority P0 | `{"action":"setPriority","value":"p0"}` |
| Btn 7 | Priority P1 | `{"action":"setPriority","value":"p1"}` |
| Btn 8 | ← MAIN | *(Companion page nav)* |
| Dial 1 turn | Scroll Projects | `selectNextProject` / `selectPrevProject` |
| Dial 2 turn | Cycle Priority | `{"action":"nextPriority"}` |

### Page: TASKS (selected project's tasks)

| Control | Label | Body |
|---------|-------|------|
| Btn 1 | Toggle Timer | `{"action":"toggleTimer"}` |
| Btn 2 | Complete Task | `{"action":"toggleTaskComplete"}` |
| Btn 3 | Cycle Priority | `{"action":"nextPriority"}` |
| Btn 4 | New Project | `{"action":"createProject"}` |
| Btn 5 | Delete Project | `{"action":"deleteProject"}` |
| Btn 8 | ← MAIN | *(Companion page nav)* |
| Dial 1 turn | Scroll Projects | `selectNextProject` / `selectPrevProject` |

### LCD Strip Feedback

Configure Companion to poll `GET http://localhost:3000/api/deck/context` every 1–2 seconds. The response includes the selected project name, status, task count, and running timer info, which can be displayed on the LCD strip via Companion's variable system.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | New project |
| `s` or `/` | Focus search |
| `1`–`4` | Filter to column |
| `0` | Show all columns |
| `l` | Toggle lights view |
| `r` | Time report |
| `e` | Export data |
| `Esc` | Close modal |
| `?` | Toggle shortcuts help |

## Data

`data/db.json` is gitignored. Re-create it any time with `npm run seed`.

## Architecture

- **SSE:** `GET /api/events` keeps a `ReadableStream` open per client. All mutation routes emit on a `globalThis` `EventEmitter`; the SSE route listens on it. Client re-fetches `/api/projects` on each event. Auto-reconnects with exponential backoff (1s → 10s cap).
- **Concurrency:** `mutateDB()` chains writes through a `globalThis` promise mutex — concurrent Stream Deck presses serialize safely. Chain survives write errors.
- **Data safety:** Atomic writes (tmp + rename), auto-backups every 30 min, corruption recovery from backups, timer crash recovery on startup.
- **Timer display:** Stored as `totalSeconds` + `lastStarted` ISO timestamp. The `Timer` component computes live elapsed via `setInterval` — no server writes while running. Crash recovery adds elapsed time on next startup.
- **Drag-and-drop:** Uses `@hello-pangea/dnd` for cross-column status changes and within-column reordering.
- **Deck context:** Server-side `selectedProjectId` in settings — dials cycle it, buttons act on it. Companion polls `/api/deck/context` for LCD feedback.
- **Desktop app:** Electron wraps a standalone Next.js server via `utilityProcess`. Shows splash screen during startup. Persists window size/position. Sends DMX blackout on quit. On macOS, closing the window keeps the server alive (dock icon). On Windows, a system tray icon keeps the process alive — closing the window hides to tray; "Quit" from the tray context menu exits cleanly.
- **Modals:** Shared `<Modal>` component provides focus trapping, ARIA attributes, and focus restoration. Form modals track dirty state and confirm before discarding.

## License

[MIT](LICENSE)
