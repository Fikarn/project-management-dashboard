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
npm run electron:build   # Next.js build + Electron compile
npm run electron:dist    # Full distributable (.dmg/.exe)
```

No test framework is configured.

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
- All mutations must call `logActivity()` (`lib/activity.ts`) before returning
- The EventEmitter (`lib/events.ts`) lives on `globalThis` to survive webpack module isolation
- The SSE route (`app/api/events/route.ts`) uses `ReadableStream` with `force-dynamic` + `runtime = 'nodejs'`

### Auto-Migration

`migrateDB()` runs inside `readDB()` and backfills missing fields with defaults. When adding new fields to types, add a corresponding backfill line in `migrateDB()` so existing `db.json` files don't break.

### Lighting / DMX Control

Dashboard has a "Lights" view (toggled with `l` key) that controls studio lights via sACN. `lib/dmx.ts` manages a singleton sACN Sender on `globalThis`. Real-time slider drags use in-memory `dmxLiveState` + throttled sACN sends (no disk writes); final values persist to `db.json` on slider release. Both light types use 2-channel DMX: intensity (0-255) + CCT (0-255, warm→cool).

### Stream Deck+ Integration

Three pages: Projects (page 1), Tasks (page 2), Lights (page 3). `settings.deckMode` tracks "project" or "light" mode. Mode toggle buttons navigate between pages and update the mode.

Server maintains `settings.selectedProjectId` — Stream Deck dials cycle the selection, buttons act on whatever is selected via `POST /api/deck/action` with static JSON payloads. Light mode uses `/api/deck/light-action`. Companion polls `GET /api/deck/lcd` for LCD strip data (handles both project and light keys).

### Timer Storage

Timers store `totalSeconds` + `lastStarted` (ISO string). The client computes live elapsed time via `setInterval` — no server polling.

## Data Model (`lib/types.ts`)

Eight core types: `Project`, `Task`, `ChecklistItem`, `ActivityEntry`, `Settings`, `Light`, `LightScene`, `LightingSettings`. The `DB` interface wraps them all. Projects, tasks, lights, and scenes have `order` fields for manual sorting. Activity log is capped at 500 entries.

## Key Directories

- `lib/` — Core utilities: database (`db.ts`), types, event emitter, CORS headers, ID generation, activity logging, DMX control (`dmx.ts`)
- `app/api/` — 39 REST routes organized by resource. All routes include CORS headers and OPTIONS preflight
- `app/components/` — 20 React components. `Dashboard.tsx` is the main orchestrator (SSE, state, modals, keyboard shortcuts, view toggle). `KanbanBoard.tsx` handles DnD. `LightingView.tsx` handles lighting control
- `scripts/seed.ts` — Recreates sample data matching current schema
- `electron/` — Electron main/preload process (separate `tsconfig.json`, compiles to `dist-electron/`)

## API Route Categories

- **Projects CRUD:** `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/status`, `/api/projects/reorder`
- **Tasks CRUD:** `/api/projects/[id]/tasks`, `/api/projects/[id]/tasks/[taskId]`, plus `/timer`, `/toggle`
- **Checklists:** `/api/projects/[id]/tasks/[taskId]/checklist/[itemId]`
- **Lights CRUD:** `/api/lights`, `/api/lights/[id]`
- **Light Control:** `/api/lights/[id]/value`, `/api/lights/dmx`, `/api/lights/all`, `/api/lights/status`
- **Scenes:** `/api/lights/scenes`, `/api/lights/scenes/[id]`, `/api/lights/scenes/[id]/recall`
- **Lighting Settings:** `/api/lights/settings`
- **Stream Deck:** `/api/deck/action`, `/api/deck/light-action`, `/api/deck/select`, `/api/deck/context`, `/api/deck/lcd`, `/api/deck/light-lcd`, `/api/companion-config`
- **Utility:** `/api/settings`, `/api/events` (SSE), `/api/activity`, `/api/reports/time`, `/api/backup`, `/api/backup/restore`, `/api/seed`, `/api/health`

## Conventions

- All new API routes must return `corsHeaders` and handle `OPTIONS`
- IDs are generated via `generateId(prefix)` (`lib/id.ts`) — format: `{prefix}-{timestamp}-{random}`
- Path alias: `@/*` maps to project root (e.g., `@/lib/db`)
- `data/db.json` and `data/backups/` are gitignored — never commit database files
