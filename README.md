# Project Management Dashboard

Local Kanban project management dashboard + studio lighting controller, designed for a secondary monitor. Fully interactive in the browser and controllable via Stream Deck+ through Bitfocus Companion. Controls studio lights via sACN/DMX through a Litepanels Apollo Bridge. Ships as a standalone desktop app for macOS and Windows. UI reflects changes instantly via SSE — no manual refresh.

## Download

Grab the latest release for your platform from [**GitHub Releases**](https://github.com/Fikarn/project-management-dashboard/releases/latest):

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `Project Manager-{version}-arm64.dmg` | Open DMG, drag to Applications. First launch: right-click → Open to bypass Gatekeeper. |
| Windows (x64) | `Project Manager Setup {version}.exe` | NSIS installer. SmartScreen may warn on first launch — click "More info" → "Run anyway". |

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

### Project Management
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

### Studio Lighting
- **DMX light control** via sACN (E1.31) through a Litepanels Apollo Bridge
- **Per-light intensity and color temperature** sliders with real-time DMX output
- **Light scenes** — save and recall presets across all lights
- **Bridge reachability detection** — TCP probe shows connection status per light
- **Connection indicators** — toolbar status (Connected/Unreachable/Off) and per-light "No Signal" badges
- **DMX blackout on quit** — lights gracefully turn off when closing the app

### Stream Deck+ Integration
- **Context-aware action API** — dials cycle selection, buttons act on current project/task/light
- **Three-page layout** — Projects, Tasks, and Lights pages
- **LCD strip feedback** — Companion polls for real-time display data

### Platform & Reliability
- **Real-time SSE** with auto-reconnect and exponential backoff
- **Atomic writes** — data file is never partially written
- **Auto-backups** every 30 minutes with automatic corruption recovery
- **Timer crash recovery** — running timers survive unexpected shutdowns
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

### Lighting

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/lights` | — | All lights |
| POST | `/api/lights` | `{name, channelStart, type, ...}` | Add light |
| PUT | `/api/lights/:id` | `{name?, channelStart?, ...}` | Update light config |
| DELETE | `/api/lights/:id` | — | Remove light |
| POST | `/api/lights/:id/value` | `{intensity?, cct?}` | Set light value (real-time DMX) |
| POST | `/api/lights/dmx` | `{channel, value}` | Raw DMX channel write |
| POST | `/api/lights/all` | `{intensity?, cct?}` | Set all lights at once |
| GET | `/api/lights/status` | — | DMX connection + bridge reachability |
| POST | `/api/lights/shutdown` | — | DMX blackout + close sACN sender |
| GET | `/api/lights/settings` | — | Lighting settings (universe, bridge IP) |
| POST | `/api/lights/settings` | `{dmxEnabled?, apolloBridgeIp?, dmxUniverse?}` | Update lighting settings |
| GET | `/api/lights/scenes` | — | All scenes |
| POST | `/api/lights/scenes` | `{name, values}` | Save scene |
| PUT | `/api/lights/scenes/:id` | `{name?, values?}` | Update scene |
| DELETE | `/api/lights/scenes/:id` | — | Delete scene |
| POST | `/api/lights/scenes/:id/recall` | — | Recall scene (apply to lights) |

### Settings & Utility

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | — | Current settings |
| POST | `/api/settings` | `{viewFilter?, sortBy?, selectedProjectId?}` | Update settings |
| GET | `/api/events` | — | SSE stream |
| GET | `/api/activity?limit=50` | — | Recent activity log |
| GET | `/api/reports/time` | — | Time report across all projects |
| POST | `/api/backup` | — | Create manual backup |
| POST | `/api/backup/restore` | `{filename}` | Restore from backup |
| GET | `/api/health` | — | Health check |
| POST | `/api/seed` | — | Re-seed database with sample data |

### Stream Deck

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/deck/action` | `{action, value?}` | Execute action on selected project/task |
| POST | `/api/deck/select` | `{direction: "next"\|"prev"}` or `{projectId}` | Cycle or set project selection |
| GET | `/api/deck/context` | — | Current selection state for Companion polling |
| GET | `/api/deck/lcd` | — | LCD strip data (project mode) |
| POST | `/api/deck/light-action` | `{action, value?}` | Execute light control action |
| GET | `/api/deck/light-lcd` | — | LCD strip data (light mode) |

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

### Page: LIGHTS

| Control | Label | Body (POST to `/api/deck/light-action`) |
|---------|-------|------|
| Btn 1 | All On | `{"action":"allOn"}` |
| Btn 2 | All Off | `{"action":"allOff"}` |
| Btn 3–6 | Scene 1–4 | `{"action":"recallScene","value":"<sceneId>"}` |
| Btn 7 | ← MAIN | *(Companion page nav)* |
| Btn 8 | Mode Toggle | `{"action":"toggleMode"}` |
| Dial turn | Adjust intensity/CCT | `{"action":"adjustIntensity","value":<delta>}` |

### LCD Strip Feedback

Configure Companion to poll `GET http://localhost:3000/api/deck/lcd` (project mode) or `/api/deck/light-lcd` (light mode) every 1–2 seconds. The response includes display data for each LCD key, which can be shown on the Stream Deck+ LCD strip via Companion's variable system. `/api/deck/context` provides the current selection state.

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

## Tech Stack

Next.js 14 (App Router), React 18, TypeScript 5 (strict), Tailwind CSS 3, @hello-pangea/dnd, Electron 33, sacn (E1.31), Vitest, Playwright, ESLint, Prettier.

## Data

`data/db.json` is gitignored. Re-create it any time with `npm run seed`.

## Architecture

- **SSE:** `GET /api/events` keeps a `ReadableStream` open per client. All mutation routes emit on a `globalThis` `EventEmitter`; the SSE route listens on it. Client re-fetches `/api/projects` on each event. Auto-reconnects with exponential backoff (1s → 10s cap).
- **Concurrency:** `mutateDB()` chains writes through a `globalThis` promise mutex — concurrent Stream Deck presses serialize safely. Chain survives write errors.
- **Data safety:** Atomic writes (tmp + rename), auto-backups every 30 min, corruption recovery from backups, timer crash recovery on startup.
- **Timer display:** Stored as `totalSeconds` + `lastStarted` ISO timestamp. The `Timer` component computes live elapsed via `setInterval` — no server writes while running. Crash recovery adds elapsed time on next startup.
- **Drag-and-drop:** Uses `@hello-pangea/dnd` for cross-column status changes and within-column reordering.
- **DMX lighting:** `lib/dmx.ts` manages a singleton sACN Sender on `globalThis`. Real-time slider drags use in-memory `dmxLiveState` + throttled sACN sends (no disk writes); final values persist to `db.json` on slider release. Bridge reachability is checked via TCP probe to port 80 — `ECONNREFUSED` counts as reachable (host is up, port closed).
- **Deck context:** Server-side `selectedProjectId` in settings — dials cycle it, buttons act on it. Companion polls `/api/deck/context` and `/api/deck/lcd` for LCD feedback. Light mode uses `/api/deck/light-action` and `/api/deck/light-lcd`.
- **Desktop app:** Electron wraps a standalone Next.js server via `utilityProcess`. Shows splash screen during startup. Persists window size/position. Sends DMX blackout on quit. On macOS, closing the window keeps the server alive (dock icon). On Windows, a system tray icon keeps the process alive — closing the window hides to tray; "Quit" from the tray context menu exits cleanly.
- **Modals:** Shared `<Modal>` component provides focus trapping, ARIA attributes, and focus restoration. Form modals track dirty state and confirm before discarding.
- **CI/CD:** Push/PR to `main` runs lint, format check, build, unit tests, and E2E tests (`.github/workflows/ci.yml`). Pushing a `v*` tag builds macOS and Windows distributables and creates a GitHub release (`.github/workflows/release.yml`).

## License

[MIT](LICENSE)
