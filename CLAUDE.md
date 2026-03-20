# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Kanban project management dashboard + studio lighting controller displayed on a secondary monitor. Next.js 14 full-stack app with file-based JSON storage, real-time SSE updates, and Stream Deck+ control via Bitfocus Companion HTTP actions. Controls studio lights (4x Litepanels Astra Bi-color + 1x Aputure Infinimat) via sACN through a Litepanels Apollo Bridge. Local-only, no authentication.

## Commands

```bash
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build (also serves as type-check)
npm run start            # Production server
npm run seed             # Reset data/db.json with sample data
npm run electron:dev     # Run in Electron (requires build first)
npm run electron:dev:open # Fast Electron dev (points at dev server, no build)
npm run electron:build   # Next.js build + Electron compile
npm run electron:dist    # Full distributable (.dmg/.exe)
npm run lint             # ESLint
npm run format:check     # Prettier check
npm test                 # Unit + API tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
npm run test:all         # Unit + E2E
```

## Tech Stack

- **Next.js 14.2** (App Router) — `params` is sync (Next.js 15+ makes it async — breaking change)
- **React 18**, **TypeScript 5** (strict mode), **Tailwind CSS 3**
- **@hello-pangea/dnd** — drag-and-drop (react-beautiful-dnd fork)
- **Electron** — desktop packaging (spawns standalone Next.js server as child process)
- **sacn** — sACN (E1.31) sender for DMX lighting control
- **Storage:** `data/db.json` (gitignored) — seed to create initial data. `DB_DIR` env var overrides data directory (used by Electron for `userData` path).

## Architecture

### Mutation Flow (critical pattern)

Every data change must follow this sequence:

```
mutateDB(fn) → eventEmitter.emit("update") → SSE pushes to browser → browser re-fetches /api/projects
```

- `mutateDB()` (`lib/db.ts`) is a promise-chain mutex that serializes all concurrent writes to `data/db.json`
- `writeDB()` uses atomic writes (write to `.tmp`, then `rename`) — partial writes never corrupt `db.json`
- `mutateDB()` catches write errors to keep the promise chain alive; callers still get the error
- All mutation route handlers (POST/PUT/DELETE) must be wrapped with `withErrorHandling()` (`lib/api.ts`) — catches malformed JSON (400) and uncaught errors (500) with CORS headers
- All mutations must call `logActivity()` (`lib/activity.ts`) before returning
- The EventEmitter (`lib/events.ts`) lives on `globalThis` to survive webpack module isolation
- The SSE route (`app/api/events/route.ts`) uses `ReadableStream` with `force-dynamic` + `runtime = 'nodejs'`

### Auto-Migration

`migrateDB()` runs inside `readDB()` and backfills missing fields with defaults. When adding new fields to types, add a corresponding backfill line in `migrateDB()` so existing `db.json` files don't break. Timer crash recovery also runs here — running timers found on startup have their elapsed time added to `totalSeconds` and are stopped.

### Data Safety

- **Atomic writes:** `writeDB()` writes to `db.json.tmp` then renames — prevents partial/corrupt files on crash
- **Auto-backups:** `writeDB()` triggers `maybeAutoBackup()` every 30 minutes; keeps 10 rolling backups in `data/backups/`
- **Corruption recovery:** `readDB()` catches JSON parse errors, scans backups for the most recent valid one, falls back to `DEFAULT_DB`. Recovery writes use atomic `writeDB()`, not raw `writeFileSync`
- **Shared backup logic:** `lib/backup.ts` is the single source for auto-backup + pruning, used by both `writeDB()` and the restore route

### Lighting / DMX Control

Dashboard has a "Lights" view (toggled with `l` key) that controls studio lights via sACN. `lib/dmx.ts` manages a singleton sACN Sender on `globalThis`. Real-time slider drags use in-memory `dmxLiveState` + throttled sACN sends (no disk writes); final values persist to `db.json` on slider release. Both light types use 2-channel DMX: intensity (0-255) + CCT (0-255, warm→cool).

### Stream Deck+ Integration

Three pages: Projects (page 1), Tasks (page 2), Lights (page 3). `settings.deckMode` tracks "project" or "light" mode. Mode toggle buttons navigate between pages and update the mode.

Server maintains `settings.selectedProjectId` — Stream Deck dials cycle the selection, buttons act on whatever is selected via `POST /api/deck/action` with static JSON payloads. Light mode uses `/api/deck/light-action`. Companion polls `GET /api/deck/lcd` for LCD strip data (handles both project and light keys).

### Timer Storage

Timers store `totalSeconds` + `lastStarted` (ISO string). The client computes live elapsed time via `setInterval` — no server polling. Timer crash recovery runs in `migrateDB()` — if a timer is found still running on startup, elapsed time is added and the timer is stopped. NaN-guarded: malformed `lastStarted` dates produce 0 elapsed rather than corrupting `totalSeconds`.

### SSE Auto-Reconnect

The browser `EventSource` in `Dashboard.tsx` auto-reconnects with exponential backoff (1s → 2s → 4s, cap 10s). On reconnect, it re-fetches all data to sync missed updates. Three connection states: connected (green), connecting (yellow), disconnected (red).

### Modal Architecture

All modals use a shared `<Modal>` wrapper (`app/components/Modal.tsx`) that provides `role="dialog"`, `aria-modal`, focus trapping (Tab/Shift+Tab cycle), auto-focus on mount, and focus restoration on close. Form modals (ProjectForm, TaskForm, LightConfig, LightingSettings) track `isDirty` and show a discard confirmation on backdrop click or Cancel when dirty.

## Data Model (`lib/types.ts`)

Eight core types: `Project`, `Task`, `ChecklistItem`, `ActivityEntry`, `Settings`, `Light`, `LightScene`, `LightingSettings`. The `DB` interface wraps them all. Projects, tasks, lights, and scenes have `order` fields for manual sorting. Activity log is capped at 500 entries.

## Key Directories

- `lib/` — Core utilities: database (`db.ts`), types, event emitter, CORS headers, ID generation, activity logging, DMX control (`dmx.ts`), backup (`backup.ts`), API error wrapper (`api.ts`)
- `app/api/` — 38 route files (some export multiple HTTP methods). All routes include CORS headers and OPTIONS preflight
- `app/components/` — 21 React components. `Dashboard.tsx` is the main orchestrator (SSE, state, modals, keyboard shortcuts, view toggle). `KanbanBoard.tsx` handles DnD. `LightingView.tsx` handles lighting control. `Modal.tsx` provides the shared accessible modal wrapper
- `scripts/seed.ts` — Recreates sample data matching current schema
- `electron/` — Electron main/preload process (separate `tsconfig.json`, compiles to `dist-electron/`)

## API Route Categories

- **Projects CRUD:** `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/status`, `/api/projects/reorder`
- **Tasks CRUD:** `/api/projects/[id]/tasks`, `/api/projects/[id]/tasks/[taskId]`, plus `/timer`, `/toggle`
- **Checklists:** `/api/projects/[id]/tasks/[taskId]/checklist/[itemId]`
- **Lights CRUD:** `/api/lights`, `/api/lights/[id]`
- **Light Control:** `/api/lights/[id]/value`, `/api/lights/dmx`, `/api/lights/all`, `/api/lights/status`, `/api/lights/shutdown`
- **Scenes:** `/api/lights/scenes`, `/api/lights/scenes/[id]`, `/api/lights/scenes/[id]/recall`
- **Lighting Settings:** `/api/lights/settings`
- **Stream Deck:** `/api/deck/action`, `/api/deck/light-action`, `/api/deck/select`, `/api/deck/context`, `/api/deck/lcd`, `/api/deck/light-lcd`, `/api/companion-config`
- **Utility:** `/api/settings`, `/api/events` (SSE), `/api/activity`, `/api/reports/time`, `/api/backup`, `/api/backup/restore`, `/api/seed`, `/api/health`

## Conventions

- All new API routes must return `corsHeaders` and handle `OPTIONS`
- All mutation handlers (POST/PUT/DELETE with `req.json()` or `mutateDB`) must be wrapped: `export const POST = withErrorHandling(async (req) => { ... });`
- IDs are generated via `generateId(prefix)` (`lib/id.ts`) — format: `{prefix}-{timestamp}-{random}`
- Path alias: `@/*` maps to project root (e.g., `@/lib/db`)
- `data/db.json` and `data/backups/` are gitignored — never commit database files
- All async `fetch()` calls in components must have try-catch + `toast("error", ...)` (exception: real-time DMX sends use `console.error`, non-critical selection uses silent catch)
- All modals must use the shared `<Modal>` wrapper from `app/components/Modal.tsx` — never use raw `fixed inset-0 bg-black/60` divs
- Form modals must track `isDirty` and show `ConfirmDialog` on close/backdrop when dirty
- Buttons that trigger async operations should have loading/disabled states to prevent double-clicks
- Toast cap is 5; error toasts last 6s, others 4s

## Testing

- **Unit/API tests** (`__tests__/`): Vitest with Node environment. Each test gets an isolated temp `DB_DIR`. Import route handlers directly and call with constructed `Request` objects — no server needed.
- **E2E tests** (`e2e/`): Playwright with Chromium. Tests run against a live dev server.
- **Test helpers**: `makeProject()`, `makeTask()`, `makeDB()` in `__tests__/helpers/fixtures.ts`; `makeRequest()` in `__tests__/helpers/request.ts`
- **Setup** (`__tests__/setup.ts`): Resets all `globalThis` singletons between tests (`dbWriteChain`, `lastAutoBackup`, `eventEmitter`, DMX state)
- Run `npm test` to verify changes pass; `npm run build` for type-checking
- Pre-commit hook runs Prettier + ESLint on staged files via lint-staged
