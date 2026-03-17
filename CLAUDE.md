# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Kanban project management dashboard displayed on a secondary monitor. Next.js 14 full-stack app with file-based JSON storage, real-time SSE updates, and Stream Deck+ control via Bitfocus Companion HTTP actions. Local-only, no authentication.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build (also serves as type-check)
npm run start    # Production server
npm run seed     # Reset data/db.json with sample data
```

No test framework is configured.

## Tech Stack

- **Next.js 14.2** (App Router) — `params` is sync (Next.js 15+ makes it async — breaking change)
- **React 18**, **TypeScript 5** (strict mode), **Tailwind CSS 3**
- **@hello-pangea/dnd** — drag-and-drop (react-beautiful-dnd fork)
- **Storage:** `data/db.json` (gitignored) — seed to create initial data

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

### Stream Deck+ Integration

Server maintains `settings.selectedProjectId` — Stream Deck dials cycle the selection, buttons act on whatever is selected via `POST /api/deck/action` with static JSON payloads. Companion polls `GET /api/deck/context` for LCD strip data.

### Timer Storage

Timers store `totalSeconds` + `lastStarted` (ISO string). The client computes live elapsed time via `setInterval` — no server polling.

## Data Model (`lib/types.ts`)

Five core types: `Project`, `Task`, `ChecklistItem`, `ActivityEntry`, `Settings`. The `DB` interface wraps them all. Projects and tasks have `order` fields for manual sorting. Activity log is capped at 500 entries.

## Key Directories

- `lib/` — Core utilities: database (`db.ts`), types, event emitter, CORS headers, ID generation, activity logging
- `app/api/` — 22 REST routes organized by resource. All routes include CORS headers and OPTIONS preflight
- `app/components/` — 12 React components. `Dashboard.tsx` is the main orchestrator (SSE, state, modals, keyboard shortcuts). `KanbanBoard.tsx` handles DnD context and column rendering
- `scripts/seed.ts` — Recreates sample data matching current schema

## API Route Categories

- **Projects CRUD:** `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/status`, `/api/projects/reorder`
- **Tasks CRUD:** `/api/projects/[id]/tasks`, `/api/projects/[id]/tasks/[taskId]`, plus `/timer`, `/toggle`
- **Checklists:** `/api/projects/[id]/tasks/[taskId]/checklist/[itemId]`
- **Stream Deck:** `/api/deck/action`, `/api/deck/select`, `/api/deck/context`
- **Utility:** `/api/settings`, `/api/events` (SSE), `/api/activity`, `/api/reports/time`, `/api/backup`, `/api/backup/restore`

## Conventions

- All new API routes must return `corsHeaders` and handle `OPTIONS`
- IDs are generated via `generateId(prefix)` (`lib/id.ts`) — format: `{prefix}-{timestamp}-{random}`
- Path alias: `@/*` maps to project root (e.g., `@/lib/db`)
- `data/db.json` and `data/backups/` are gitignored — never commit database files
