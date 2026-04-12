[![CI](https://github.com/Fikarn/project-management-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/ci.yml)

# Project Management Dashboard

Local Kanban project management dashboard + studio lighting controller + audio mixer controller, designed for a secondary monitor. Fully interactive in the browser and controllable via Stream Deck+ through Bitfocus Companion. Controls studio lights via sACN/DMX through a Litepanels Apollo Bridge. Controls an RME Fireface UFX III audio interface via OSC through TotalMix FX. Ships as a standalone desktop app for macOS and Windows. UI reflects changes instantly via SSE — no manual refresh.

## Download

Grab the latest release for your platform from [**GitHub Releases**](https://github.com/Fikarn/project-management-dashboard/releases/latest):

| Platform              | File                                  | Notes                                                                                    |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| macOS (Apple Silicon) | `Project Manager-{version}-arm64.dmg` | Open DMG, drag to Applications. First launch: right-click → Open to bypass Gatekeeper.   |
| Windows (x64)         | `Project Manager Setup {version}.exe` | NSIS installer. SmartScreen may warn on first launch — click "More info" → "Run anyway". |

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
- **Task checklists** — subtask checklists on each task with add, toggle, edit, and delete
- **Search** across project titles, task titles, descriptions, and labels
- **Sort** by manual order, priority, date, or name
- **Activity log** tracking all changes
- **Keyboard shortcuts** (press `?` to see them, hint pulse on first visit)
- **Project detail modal** with tasks, progress, and activity

### Studio Lighting

Supports three fixture types via CRMX wireless DMX through a Litepanels Apollo Bridge:

- **Litepanels Astra Bi-Color Soft** — 2-channel (intensity + CCT, 3200–5600K)
- **Aputure Infinimat 2×4** — 4-channel Profile 2 (intensity, CCT, ±green/magenta tint, strobe; 2000–10000K)
- **Aputure Infinibar PB12** — 8-channel Mode 1 (intensity, CCT, color mix, R/G/B, effect, speed; 2000–10000K, RGB-capable)

**Color control:**

- **CCT mode** — Kelvin slider with quick presets (Tungsten, Halogen, Fluorescent, Daylight, Overcast, Shade) and gel presets (Full/Half/Quarter CTO and CTB), auto-filtered to fixture range
- **HSI mode** — Canvas-based circular hue wheel with inner saturation gradient (RGB-capable lights)
- **RGB mode** — Per-channel sliders (0–255) with filled color gradients (RGB-capable lights)

**Mixer and control:**

- **Grand Master fader** — Global intensity multiplier (0–100%) in the toolbar, applied to all dimmer channels in real time
- **±Green/Magenta tint** — Per-light tint correction for the Infinimat (−100 to +100)
- **Light groups** — Organize lights into named groups (e.g., Key, Fill) with collapsible headers, count badges, and group-level ON/PARTIAL/OFF power toggle
- **Compact/expanded view** — Toggle between full LightCard panels and a compact single-row view per light

**Effects engine (server-side, 30fps):**

- **Pulse** — Sine-wave intensity oscillation
- **Strobe** — Hard on/off toggling
- **Candle** — Layered random flicker
- Speed control (1–10, mapping to 0.5–5Hz) per light

**Scenes:**

- Save and recall lighting presets across all lights
- **Fade recall** with configurable duration (Instant / 1s / 2s / 3s / 5s) — server-side interpolation with ease-in-out curve
- Visual scene cards with color swatch strips and click-to-rename
- "Update" button to overwrite a scene with current light states

**Monitoring and reliability:**

- **DMX Output Monitor** — Toggleable sidebar panel showing real-time DMX channel values grouped by fixture, with bar visualization and channel labels (polls every 500ms)
- **Bridge reachability detection** — TCP probe shows connection status in the toolbar (green/red) and per-light "No Signal" badges
- **Auto-init on open** — sACN sender initializes and syncs all fixture states when the Lighting view is opened; no manual setup step required
- **DMX blackout on quit** — lights gracefully turn off when closing the app

**Setup Wizard:**

- Multi-step first-run wizard guides through Apollo Bridge setup, CRMX pairing (tabbed per fixture type), DMX address assignment (with overlap detection), and Stream Deck configuration
- Branches based on use case: PM-only (4 steps) or PM + Lighting (9 steps)

### Studio Audio

Controls an RME Fireface UFX III audio interface (4 mic preamp inputs) via OSC through TotalMix FX:

- **Configurable channels** — CRUD for audio input channels, each mapped to a TotalMix input (1–128)
- **Full preamp control** — Gain (0–75 dB), fader (0–1.0), mute, solo, phantom (48V), phase, pad, lo-cut per channel
- **Mixer console layout** — Vertical channel strips side by side with toolbar on top
- **Real-time metering** — Server receives level data from TotalMix via OSC; UI polls at 100ms for live meter bars
- **Snapshots** — User-named snapshots mapped to TotalMix snapshot slots (0–7); recall via OSC
- **Auto-init on open** — OSC client/server initializes and syncs all channel values when the Audio view is opened
- **Auto-recovery** — Broken OSC connections are automatically reinitialized (rate-limited to 3/minute), same self-healing pattern as DMX

### Stream Deck+ Integration

- **Context-aware action API** — dials cycle selection, buttons act on current project/task/light/audio channel
- **Four-page layout** — Projects, Tasks, Lights, and Audio pages
- **4 rotary encoders in light mode** — Dial 1 = intensity, Dial 2 = CCT, Dial 3 = Red (RGB) or ±G/M tint (Infinimat), Dial 4 = Green/Blue (press to cycle, RGB only)
- **4 rotary encoders in audio mode** — Dials 1–4 = gain for channels 1–4 (±3 dB per tick, press to toggle mute)
- **Audio buttons** — Mute toggles for channels 1–4, phantom (48V) toggles for channels 1–2, snapshot recall
- **LCD strip feedback** — Companion polls for real-time display data (channel name, gain, mute indicator)

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

| Method | Endpoint                                            | Body                                                               | Description                       |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| GET    | `/api/projects`                                     | —                                                                  | All projects, tasks, and settings |
| POST   | `/api/projects`                                     | `{title, description?, priority?, status?}`                        | Create project                    |
| PUT    | `/api/projects/:id`                                 | `{title?, description?, priority?}`                                | Update project                    |
| DELETE | `/api/projects/:id`                                 | —                                                                  | Delete project and its tasks      |
| POST   | `/api/projects/:id/status`                          | `{status}`                                                         | Set project status                |
| POST   | `/api/projects/:id/status/next`                     | —                                                                  | Cycle to next status              |
| POST   | `/api/projects/reorder`                             | `{projectId, newStatus, newIndex}`                                 | Move/reorder project              |
| POST   | `/api/projects/:id/tasks`                           | `{title, description?, priority?, dueDate?, labels?}`              | Create task                       |
| PUT    | `/api/projects/:id/tasks/:taskId`                   | `{title?, description?, priority?, dueDate?, labels?, completed?}` | Update task                       |
| DELETE | `/api/projects/:id/tasks/:taskId`                   | —                                                                  | Delete task                       |
| POST   | `/api/projects/:id/tasks/:taskId/timer`             | `{action: "start"\|"stop"\|"toggle"}`                              | Control task timer                |
| POST   | `/api/projects/:id/tasks/:taskId/toggle`            | —                                                                  | Toggle task completed             |
| POST   | `/api/projects/:id/tasks/:taskId/checklist`         | `{text}`                                                           | Add checklist item                |
| PUT    | `/api/projects/:id/tasks/:taskId/checklist/:itemId` | `{text?, done?}`                                                   | Update checklist item             |
| DELETE | `/api/projects/:id/tasks/:taskId/checklist/:itemId` | —                                                                  | Delete checklist item             |

### Lighting

| Method | Endpoint                  | Body                                                           | Description                                           |
| ------ | ------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/lights`             | —                                                              | All lights                                            |
| POST   | `/api/lights`             | `{name, channelStart, type, ...}`                              | Add light                                             |
| PUT    | `/api/lights/:id`         | `{name?, channelStart?, ...}`                                  | Update light config                                   |
| DELETE | `/api/lights/:id`         | —                                                              | Remove light                                          |
| POST   | `/api/lights/:id/value`   | `{intensity?, cct?, red?, green?, blue?, gmTint?, colorMode?}` | Set light value (real-time DMX)                       |
| POST   | `/api/lights/:id/effect`  | `{type: "pulse"\|"strobe"\|"candle"\|null, speed?}`            | Set or clear per-light effect                         |
| POST   | `/api/lights/dmx`         | `{channel, value}`                                             | Raw DMX channel write                                 |
| POST   | `/api/lights/all`         | `{intensity?, cct?}`                                           | Set all lights at once                                |
| POST   | `/api/lights/init`        | —                                                              | Initialize sACN sender and sync all fixture states    |
| GET    | `/api/lights/status`      | —                                                              | DMX connection + bridge reachability                  |
| POST   | `/api/lights/shutdown`    | —                                                              | DMX blackout + close sACN sender                      |
| GET    | `/api/lights/dmx-monitor` | —                                                              | Real-time DMX channel values for all fixtures         |
| GET    | `/api/lights/settings`    | —                                                              | Lighting settings (universe, bridge IP, grand master) |
| POST   | `/api/lights/settings`    | `{dmxEnabled?, apolloBridgeIp?, dmxUniverse?, grandMaster?}`   | Update lighting settings                              |

### Light Groups

| Method | Endpoint                 | Body                      | Description                     |
| ------ | ------------------------ | ------------------------- | ------------------------------- |
| GET    | `/api/lights/groups`     | —                         | All light groups                |
| POST   | `/api/lights/groups`     | `{name}`                  | Create group                    |
| PUT    | `/api/lights/groups/:id` | `{name?, order?}`         | Update group                    |
| DELETE | `/api/lights/groups/:id` | —                         | Delete group (unassigns lights) |
| PATCH  | `/api/lights/groups/:id` | `{intensity?, cct?, on?}` | Set all lights in group         |

### Scenes

| Method | Endpoint                        | Body                     | Description                                                              |
| ------ | ------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| GET    | `/api/lights/scenes`            | —                        | All scenes                                                               |
| POST   | `/api/lights/scenes`            | `{name, states}`         | Save scene                                                               |
| PUT    | `/api/lights/scenes/:id`        | `{name?, updateStates?}` | Update scene (set `updateStates: true` to overwrite with current states) |
| DELETE | `/api/lights/scenes/:id`        | —                        | Delete scene                                                             |
| POST   | `/api/lights/scenes/:id/recall` | `{fadeDuration?}`        | Recall scene; optional fade in seconds (0 = instant)                     |

### Audio

| Method | Endpoint                          | Body                                                            | Description                                   |
| ------ | --------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| GET    | `/api/audio`                      | —                                                               | All channels, snapshots, and audio settings   |
| POST   | `/api/audio`                      | `{name, oscChannel?}`                                           | Create audio channel                          |
| PUT    | `/api/audio/:id`                  | `{name?, oscChannel?}`                                          | Update channel config                         |
| DELETE | `/api/audio/:id`                  | —                                                               | Delete channel                                |
| POST   | `/api/audio/:id/value`            | `{gain?, fader?, mute?, solo?, phantom?, phase?, pad?, loCut?}` | Persist channel values + send OSC             |
| POST   | `/api/audio/osc`                  | `{channelId, values}`                                           | Live OSC send only (slider drag, no DB write) |
| POST   | `/api/audio/init`                 | —                                                               | Initialize OSC + sync all channel values      |
| GET    | `/api/audio/status`               | —                                                               | OSC connection status                         |
| GET    | `/api/audio/metering`             | —                                                               | Current meter levels from TotalMix            |
| POST   | `/api/audio/reorder`              | `{orderedIds}`                                                  | Reorder channels                              |
| GET    | `/api/audio/settings`             | —                                                               | Audio/OSC settings                            |
| POST   | `/api/audio/settings`             | `{oscEnabled?, oscSendHost?, oscSendPort?, oscReceivePort?}`    | Update audio settings (reinits OSC on change) |
| GET    | `/api/audio/snapshots`            | —                                                               | All audio snapshots                           |
| POST   | `/api/audio/snapshots`            | `{name, oscIndex}`                                              | Create snapshot                               |
| PUT    | `/api/audio/snapshots/:id`        | `{name?, oscIndex?}`                                            | Update snapshot                               |
| DELETE | `/api/audio/snapshots/:id`        | —                                                               | Delete snapshot                               |
| POST   | `/api/audio/snapshots/:id/recall` | —                                                               | Recall snapshot via OSC                       |

### Settings & Utility

| Method | Endpoint                 | Body                                         | Description                                                                           |
| ------ | ------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/api/settings`          | —                                            | Current settings                                                                      |
| POST   | `/api/settings`          | `{viewFilter?, sortBy?, selectedProjectId?}` | Update settings                                                                       |
| GET    | `/api/events`            | —                                            | SSE stream                                                                            |
| GET    | `/api/activity?limit=50` | —                                            | Recent activity log                                                                   |
| GET    | `/api/reports/time`      | —                                            | Time report across all projects                                                       |
| POST   | `/api/backup`            | —                                            | Create manual backup                                                                  |
| POST   | `/api/backup/restore`    | `{filename}`                                 | Restore from backup                                                                   |
| GET    | `/api/health`            | —                                            | Health check                                                                          |
| POST   | `/api/seed`              | `{preserveLights?}`                          | Re-seed database with sample data; set `preserveLights: true` to keep lighting config |

### Stream Deck

| Method | Endpoint                 | Body                                           | Description                                   |
| ------ | ------------------------ | ---------------------------------------------- | --------------------------------------------- |
| POST   | `/api/deck/action`       | `{action, value?}`                             | Execute action on selected project/task       |
| POST   | `/api/deck/select`       | `{direction: "next"\|"prev"}` or `{projectId}` | Cycle or set project selection                |
| GET    | `/api/deck/context`      | —                                              | Current selection state for Companion polling |
| GET    | `/api/deck/lcd`          | —                                              | LCD strip data (project mode)                 |
| POST   | `/api/deck/light-action` | `{action, value?}`                             | Execute light control action                  |
| POST   | `/api/deck/dial`         | `{dial, delta}`                                | Rotary encoder input for light parameters     |
| GET    | `/api/deck/light-lcd`    | —                                              | LCD strip data (light mode)                   |
| POST   | `/api/deck/audio-action` | `{action, value?}`                             | Execute audio control action                  |
| GET    | `/api/deck/audio-lcd`    | `?key=<lcd_key>`                               | LCD strip data (audio mode)                   |

All routes use origin-validated CORS via `getCorsHeaders(req)` from `lib/cors.ts`, restricting access to `localhost` origins.

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

| Control       | Label         | Body                                           |
| ------------- | ------------- | ---------------------------------------------- |
| Btn 1         | View All      | `{"action":"setFilter","value":"all"}`         |
| Btn 2         | To Do         | `{"action":"setFilter","value":"todo"}`        |
| Btn 3         | In Progress   | `{"action":"setFilter","value":"in-progress"}` |
| Btn 4         | Blocked       | `{"action":"setFilter","value":"blocked"}`     |
| Btn 5         | Done          | `{"action":"setFilter","value":"done"}`        |
| Btn 6         | New Project   | `{"action":"createProject"}`                   |
| Btn 7         | → STATUS      | _(Companion page nav)_                         |
| Btn 8         | → TASKS       | _(Companion page nav)_                         |
| Dial 1 turn R | Next Project  | `{"action":"selectNextProject"}`               |
| Dial 1 turn L | Prev Project  | `{"action":"selectPrevProject"}`               |
| Dial 1 press  | Open Detail   | `{"action":"openDetail"}`                      |
| Dial 2 turn R | Next Priority | `{"action":"nextPriority"}`                    |

### Page: STATUS (selected project)

| Control     | Label           | Body                                           |
| ----------- | --------------- | ---------------------------------------------- |
| Btn 1       | Set To Do       | `{"action":"setStatus","value":"todo"}`        |
| Btn 2       | Set In Progress | `{"action":"setStatus","value":"in-progress"}` |
| Btn 3       | Set Blocked     | `{"action":"setStatus","value":"blocked"}`     |
| Btn 4       | Set Done        | `{"action":"setStatus","value":"done"}`        |
| Btn 5       | Cycle Status    | `{"action":"nextStatus"}`                      |
| Btn 6       | Priority P0     | `{"action":"setPriority","value":"p0"}`        |
| Btn 7       | Priority P1     | `{"action":"setPriority","value":"p1"}`        |
| Btn 8       | ← MAIN          | _(Companion page nav)_                         |
| Dial 1 turn | Scroll Projects | `selectNextProject` / `selectPrevProject`      |
| Dial 2 turn | Cycle Priority  | `{"action":"nextPriority"}`                    |

### Page: TASKS (selected project's tasks)

| Control     | Label           | Body                                      |
| ----------- | --------------- | ----------------------------------------- |
| Btn 1       | Toggle Timer    | `{"action":"toggleTimer"}`                |
| Btn 2       | Complete Task   | `{"action":"toggleTaskComplete"}`         |
| Btn 3       | Cycle Priority  | `{"action":"nextPriority"}`               |
| Btn 4       | New Project     | `{"action":"createProject"}`              |
| Btn 5       | Delete Project  | `{"action":"deleteProject"}`              |
| Btn 8       | ← MAIN          | _(Companion page nav)_                    |
| Dial 1 turn | Scroll Projects | `selectNextProject` / `selectPrevProject` |

### Page: LIGHTS

Buttons POST to `/api/deck/light-action`. Dials POST to `/api/deck/dial`.

| Control      | Label                              | Body                                           |
| ------------ | ---------------------------------- | ---------------------------------------------- |
| Btn 1        | All On                             | `{"action":"allOn"}`                           |
| Btn 2        | All Off                            | `{"action":"allOff"}`                          |
| Btn 3–6      | Scene 1–4                          | `{"action":"recallScene","value":"<sceneId>"}` |
| Btn 7        | ← MAIN                             | _(Companion page nav)_                         |
| Btn 8        | Mode Toggle                        | `{"action":"toggleMode"}`                      |
| Dial 1 turn  | Intensity ±%                       | `{"dial":1,"delta":<n>}` → `/api/deck/dial`    |
| Dial 1 press | Toggle on/off                      | `{"action":"toggleLight"}`                     |
| Dial 2 turn  | CCT ±K                             | `{"dial":2,"delta":<n>}` → `/api/deck/dial`    |
| Dial 2 press | Reset CCT                          | `{"action":"resetCct"}`                        |
| Dial 3 turn  | Red (RGB) or ±G/M tint (Infinimat) | `{"dial":3,"delta":<n>}` → `/api/deck/dial`    |
| Dial 3 press | Reset tint to 0 (Infinimat)        | `{"action":"resetTint"}`                       |
| Dial 4 turn  | Green / Blue (press to cycle)      | `{"dial":4,"delta":<n>}` → `/api/deck/dial`    |

### Page: AUDIO

Buttons POST to `/api/deck/audio-action`. Dials POST to `/api/deck/audio-action`.

| Control        | Label       | Body                                               |
| -------------- | ----------- | -------------------------------------------------- |
| Btn 1          | ← LIGHTS    | `{"action":"switchToDeckMode","value":"light"}`    |
| Btn 2–5        | Mute 1–4    | `{"action":"toggleMute","value":"<1-4>"}`          |
| Btn 6–7        | 48V 1–2     | `{"action":"togglePhantom","value":"<1-2>"}`       |
| Btn 8          | Recall      | `{"action":"recallSnapshot"}`                      |
| Dial 1–4 turn  | Gain ±3 dB  | `{"action":"gainUp","value":"<1-4>"}` / `gainDown` |
| Dial 1–4 press | Mute toggle | `{"action":"toggleMute","value":"<1-4>"}`          |

### LCD Strip Feedback

Configure Companion to poll `GET http://localhost:3000/api/deck/lcd` (project mode), `/api/deck/light-lcd` (light mode), or `/api/deck/audio-lcd?key=<key>` (audio mode) every 1–2 seconds. The response includes display data for each LCD key, which can be shown on the Stream Deck+ LCD strip via Companion's variable system. `/api/deck/context` provides the current selection state.

## Keyboard Shortcuts

| Key        | Action                |
| ---------- | --------------------- |
| `n`        | New project           |
| `s` or `/` | Focus search          |
| `1`–`4`    | Filter to column      |
| `0`        | Show all columns      |
| `l`        | Toggle lights view    |
| `a`        | Toggle audio view     |
| `r`        | Time report           |
| `e`        | Export data           |
| `Esc`      | Close modal           |
| `?`        | Toggle shortcuts help |

## Tech Stack

Next.js 14 (App Router), React 18, TypeScript 5 (strict), Tailwind CSS 3, @hello-pangea/dnd, Electron 33, sacn (E1.31), node-osc (OSC), Vitest, Playwright, ESLint, Prettier.

## Data

`data/db.json` is gitignored. Re-create it any time with `npm run seed`.

## Architecture

- **SSE:** `GET /api/events` keeps a `ReadableStream` open per client. All mutation routes emit on a `globalThis` `EventEmitter`; the SSE route listens on it. Client re-fetches `/api/projects` on each event. Auto-reconnects with exponential backoff (1s → 10s cap).
- **Concurrency:** `mutateDB()` chains writes through a `globalThis` promise mutex — concurrent Stream Deck presses serialize safely. Chain survives write errors.
- **Data safety:** Atomic writes (tmp + rename), auto-backups every 30 min, corruption recovery from backups, timer crash recovery on startup.
- **Timer display:** Stored as `totalSeconds` + `lastStarted` ISO timestamp. The `Timer` component computes live elapsed via `setInterval` — no server writes while running. Crash recovery adds elapsed time on next startup.
- **Drag-and-drop:** Uses `@hello-pangea/dnd` for cross-column status changes and within-column reordering.
- **DMX lighting:** `lib/dmx.ts` manages a singleton sACN Sender on `globalThis`. Real-time slider drags use in-memory `dmxLiveState` + throttled sACN sends (no disk writes); final values persist to `db.json` on slider release. Bridge reachability is checked via TCP probe to port 80 — `ECONNREFUSED` counts as reachable (host is up, port closed). Grand Master is applied as a multiplier on all dimmer channels in `sendDmxFrame()`.
- **Effects engine:** `lib/effects.ts` runs per-light effects (Pulse/Strobe/Candle) server-side on a `globalThis` interval at 30fps. Speed 1–10 maps to 0.5–5Hz.
- **Scene fades:** Server-side interpolation in `lib/dmx.ts` (`startFade()`) at ~30fps with ease-in-out curve. Persists final values on completion.
- **OSC audio:** `lib/osc.ts` manages singleton OSC Client + Server on `globalThis`. Real-time slider drags use in-memory `oscLiveState` + throttled OSC sends (no disk writes); final values persist on release. Auto-recovery on send failure (rate-limited to 3/min). UDP client sends to TotalMix (default 127.0.0.1:7001), UDP server receives metering on port 9001.
- **Deck context:** Server-side `selectedProjectId` in settings — dials cycle it, buttons act on it. Companion polls `/api/deck/context` and `/api/deck/lcd` for LCD feedback. Light mode uses `/api/deck/light-action`, `/api/deck/dial`, and `/api/deck/light-lcd`. Audio mode uses `/api/deck/audio-action` and `/api/deck/audio-lcd`.
- **Desktop app:** Electron wraps a standalone Next.js server via `utilityProcess`. Shows splash screen during startup. Persists window size/position. Sends DMX blackout on quit. On macOS, closing the window keeps the server alive (dock icon). On Windows, a system tray icon keeps the process alive — closing the window hides to tray; "Quit" from the tray context menu exits cleanly.
- **Modals:** Shared `<Modal>` component provides focus trapping, ARIA attributes, and focus restoration. Form modals track dirty state and confirm before discarding.
- **CI/CD:** Push/PR to `main` runs lint, format check, build, unit tests, and E2E tests (`.github/workflows/ci.yml`). Pushing a `v*` tag builds macOS and Windows distributables and creates a GitHub release (`.github/workflows/release.yml`).

## License

[MIT](LICENSE)
