# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Kanban project management dashboard + studio lighting controller + audio mixer controller displayed on a secondary monitor. Next.js 14 full-stack app with file-based JSON storage, real-time SSE updates, and Stream Deck+ control via Bitfocus Companion HTTP actions. Controls studio lights (3x Litepanels Astra Bi-Color Soft + 1x Aputure Infinimat 2x4 + 4x Aputure Infinibar PB12) via sACN through a Litepanels Apollo Lightbridge using CRMX wireless DMX. Controls an RME Fireface UFX III audio interface (4 mic preamp inputs) via OSC through TotalMix FX. Local-only, no authentication.

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
npm run electron:dist:mac:local  # Unsigned local macOS build (no cert required)
npm run lint             # ESLint
npm run format:check     # Prettier check
npm test                 # Unit + API tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
npm run test:all         # Unit + E2E
npm run analyze          # Bundle size treemap (opens in browser)
```

## Tech Stack

- **Next.js 14.2** (App Router) — `params` is sync (Next.js 15+ makes it async — breaking change)
- **React 18**, **TypeScript 5** (strict mode), **Tailwind CSS 3**
- **@hello-pangea/dnd** — drag-and-drop (react-beautiful-dnd fork)
- **Electron 33** + **electron-updater** — desktop packaging with auto-update (GitHub Releases)
- **sacn** — sACN (E1.31) sender for DMX lighting control
- **node-osc** — OSC (Open Sound Control) UDP client/server for TotalMix FX audio control
- **@sentry/nextjs** — error tracking (opt-in via `SENTRY_DSN` env var; inert if unset)
- **react-resizable-panels 4** — resizable panel layout for lighting page (v4 API: `Group`, `Panel`, `Separator`, `useDefaultLayout`)
- **Storage:** `data/db.json` (gitignored) — seed to create initial data. `DB_DIR` env var overrides data directory (used by Electron for `userData` path).

## Environment Variables

All optional. Document new ones in `.env.example`. Key vars: `DB_DIR` (override data directory; Electron sets to `userData/data`), `SENTRY_DSN` (enables Sentry; omit to disable), `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` (CI source map upload), `ANALYZE` (`"true"` for bundle treemap).

## Architecture

### Mutation Flow (critical pattern)

Every data change must follow this sequence:

```
mutateDB(fn) → eventEmitter.emit("update") → SSE pushes to browser → browser re-fetches /api/projects
```

- `mutateDB()` (`lib/db.ts`) is a promise-chain mutex that serializes all concurrent writes to `data/db.json`
- `writeDB()` uses atomic writes (write to `.tmp`, then `rename`) — partial writes never corrupt `db.json`
- All mutation route handlers (POST/PUT/DELETE) must be wrapped with `withErrorHandling()` (`lib/api.ts`)
- All mutations must call `logActivity()` (`lib/activity.ts`) before returning
- The EventEmitter (`lib/events.ts`) lives on `globalThis` to survive webpack module isolation
- The SSE route (`app/api/events/route.ts`) uses `ReadableStream` with `force-dynamic` + `runtime = 'nodejs'`

### Auto-Migration & Schema

`migrateDB()` runs inside `readDB()` and backfills missing fields with defaults. When adding new fields to types, add a corresponding backfill line in `migrateDB()` so existing `db.json` files don't break. `DB.schemaVersion` (currently `7`) is written on every save — increment it in `DEFAULT_DB` and `migrateDB()` whenever the schema changes.

### Data Safety

- **Atomic writes** via `.tmp` + rename; **auto-backups** every 30 min (10 rolling in `data/backups/`)
- **Corruption recovery:** `readDB()` scans backups for valid JSON, falls back to `DEFAULT_DB`
- **Disk full:** `writeDB()` throws `DiskFullError` on `ENOSPC`, caught by API wrappers as HTTP 507

### Lighting / DMX Control

Dashboard "Lights" view (toggled with `l` key) controls studio lights via sACN. `lib/dmx.ts` manages a singleton sACN Sender on `globalThis`.

**Critical patterns:**

- Real-time slider drags use in-memory `dmxLiveState` + throttled sACN sends (no disk writes); final values persist on slider release
- `updateLiveState()` initializes with `{} as Partial<LiveState>` — never use full defaults that would shadow DB values
- Auto-init on page open: `LightingView` calls `POST /api/lights/init` on mount
- Bridge reachability: `checkBridgeReachable()` does TCP probe; polled every 10s by `LightingView`

**Light type registry** (`lib/light-types.ts`): Single source of truth for hardware specs (channel counts, CCT ranges, spatial shapes). Three types: `astra-bicolor` (2ch), `infinimat` (4ch), `infinibar-pb12` (8ch). Helpers: `getCctRange()`, `getChannelCount()`, `supportsRgb()`, `supportsGm()`.

**Key subsystems** (see code for details): color modes (CCT/HSI/RGB), Grand Master fader, light groups with power toggle, scenes with fade recall, effects engine (Pulse/Strobe/Candle), spatial studio view (2D canvas with drag, multi-select, beam cones, markers), DMX monitor, resizable panel layout.

### Audio / OSC Control

Dashboard "Audio" view (toggled with `a` key) controls an RME Fireface UFX III via OSC. `lib/osc.ts` mirrors `lib/dmx.ts`: singleton on `globalThis`, in-memory `oscLiveState` for drag, auto-recovery rate-limited to 3/minute.

Auto-init on page open. Channel management (CRUD), snapshots (recall via OSC), metering (100ms polling). OSC addresses use `/1/` prefix (TotalMix submix 1 = inputs).

### Stream Deck+ Integration

Four pages: Projects, Tasks, Lights, Audio. `settings.deckMode` tracks active mode. Server maintains `selectedProjectId`/`selectedLightId`/`selectedChannelId`. Dials mapped to relevant parameters per mode. Companion polls LCD endpoints for strip data.

### Other Subsystems

- **Timers:** `totalSeconds` + `lastStarted` (ISO). Client computes elapsed via `setInterval`. Crash recovery in `migrateDB()`.
- **SSE:** Auto-reconnect with exponential backoff (1s → 2s → 4s, cap 10s). Three states: connected/connecting/disconnected. `db-error` event keeps connection alive on read failures.
- **Modals:** Shared `<Modal>` wrapper (`app/components/shared/Modal.tsx`) with `role="dialog"`, `aria-modal`, focus trapping, auto-focus, focus restoration. Form modals track `isDirty` + discard confirmation.
- **Setup Wizard:** Multi-step onboarding shown on first run. Branches by use case (PM-only vs PM+Lighting). Sets `hasCompletedSetup` on completion.
- **Electron:** macOS close keeps app running (for Companion/lights). Sleep/wake handles DMX blackout/reinit. Auto-update via `electron-updater`. Server auto-restarts on crash (max 3/minute). Code signing infra ready but cert not yet active.

## Data Model (`lib/types.ts`)

Core types: `Project`, `Task`, `ChecklistItem`, `ActivityEntry`, `Settings`, `Light`, `LightGroup`, `LightScene`, `LightEffect`, `LightingSettings`, `AudioChannel`, `AudioSnapshot`, `AudioSettings`. The `DB` interface wraps them all. See `lib/types.ts` for field definitions.

**Adding new required fields** to a type like `Light` requires updates in 4 places: (1) `migrateDB()` backfill in `lib/db.ts`, (2) creation route in the relevant API, (3) `makeLight()`/`makeProject()`/etc. in `__tests__/helpers/fixtures.ts`, (4) `buildSeedData()` in `lib/seed-data.ts`. For fields on the `DB` interface itself, locations differ: (1) `DEFAULT_DB`, (2) `migrateDB()`, (3) `makeDB()`, (4) `buildSeedData()`. Also increment `schemaVersion`.

## Key Directories

- `lib/` — Core: database, types, event emitter, CORS, IDs, activity logging, DMX (`dmx.ts`), OSC (`osc.ts`), effects (`effects.ts`), backup, API wrappers, client API layer, light types, seed data, formatting
- `app/api/` — 57 route files. All include CORS headers and OPTIONS preflight
- `app/components/` — By domain: `lighting/` (+ `lighting/spatial/`, `lighting/hooks/`), `audio/` (+ `audio/hooks/`), `kanban/`, `shared/`, plus root `Dashboard.tsx` and `SetupWizard.tsx`
- `app/setup/` — Stream Deck setup page components
- `scripts/` — `seed.ts`, `audit-contrast.ts` (WCAG contrast verification)
- `electron/` — Main/preload process (separate `tsconfig.json`, compiles to `dist-electron/`)

## Reliability & Fault-Tolerance

This runs in live recording studios — a crash means lights go dark or audio drops out on camera. Non-negotiable principles:

### Route handlers must be wrapped

- Mutation routes (POST/PUT/DELETE): `withErrorHandling()`. GET routes: `withGetHandler()`. Both from `lib/api.ts`.
- `withErrorHandling` catches `SyntaxError` (400), `DiskFullError` (507). `TypeError` is intentionally NOT caught as 400.
- Global handlers in `lib/process-safety.ts` are last-resort only. Sentry fires if `SENTRY_DSN` is set, otherwise inert.

### DMX and OSC must self-heal

Both follow the same pattern: singleton on `globalThis`, auto-recovery on send failure (destroy → reinit on next call), rate-limited to 3 reinits/minute. All sends in route handlers must be wrapped in try-catch — a protocol failure must never prevent the API response or DB update. Effects engine auto-pauses after 3 consecutive DMX failures, auto-resumes on successful `initDmx()`.

### Connection resilience

- SSE: 30s keepalive ping, `db-error` event on read failure, browser reconnects with backoff
- Health endpoint (`/api/health`): real DB probe returning 200/503. Electron polls this at startup.
- Client: `AppErrorBoundary` in `layout.tsx`, scoped `ErrorBoundary` on KanbanBoard/LightingView, initial load retry (5 attempts), SSE disconnect toast after 15s

### Input validation

- IPs: `isValidIpv4` + octet range. DMX universe: [1-63999]. DMX address: 1 ≤ addr ≤ (512 − channelCount + 1) with overlap detection via `findDmxOverlap()`.
- OSC: `isValidOscHost()` (IPv4 or "localhost"), `isValidPort()` (1-65535)
- Light names: max 50 chars. Types: validated against `VALID_TYPES`. Activity log: HTML-sanitized, 200 char cap.
- Backup restore: validates settings/project/task structure before applying

### Security headers

`next.config.js`: X-Frame-Options DENY, X-Content-Type-Options nosniff, CSP (`unsafe-inline` required by Next.js 14). `lib/cors.ts`: origin-validated CORS restricting to localhost — no wildcard `*` anywhere.

## Known Pitfalls

Verified bugs and library quirks. Do not reintroduce.

### sacn library: `useRawDmxValues: true` is mandatory

Without it, values are treated as percentages (0–100) and multiplied by 2.55. Our functions output raw 0–255, so values above ~100 clip to 255 (sliders max out at center).

### Slider controlled inputs need local drag state

`value={light.intensity}` snaps back during drag because the prop doesn't update until the SSE re-fetch cycle completes. Fix: local `dragging` state per slider key, display local value during drag, clear on mouseUp/touchEnd.

### Live state must not have defaults that shadow DB values

`updateLiveState()` must initialize with `{} as Partial<LiveState>`, not `{ on: false, intensity: 0, ... }`. Otherwise a drag creating `{ intensity: 50 }` inherits `on: false` and turns the light off.

### Hot-reload doesn't work for server-side DMX/OSC code

sACN sender, `dmxLiveState`, fade state, effect intervals, OSC client/server, and `oscLiveState` all live on `globalThis`. After editing `lib/dmx.ts`, `lib/effects.ts`, `lib/osc.ts`, or `lib/light-types.ts`, kill all node processes and restart the dev server.

### Infinimat GM tint: DMX 0 = "No Effect", not DMX 133

The spec says DMX 120–145 is "Neutral" but the physical fixture still produces tint at those values. DMX 0 (the "No Effect" range) is correct. `gmTintToDmx()` maps `null` and `0` to DMX 0.

### react-resizable-panels v4 API differs from v2/v3

v4 uses `Group`/`Separator` (not `PanelGroup`/`PanelResizeHandle`), `orientation` (not `direction`), `useDefaultLayout` (not `autoSaveId`). Sizes: **numeric values are pixels**, use strings like `"75%"` for percentages. `style={{ flexBasis: N }}` for separator handle width.

## Conventions

- All new API routes: `getCorsHeaders(req)` from `lib/cors.ts` + handle `OPTIONS`
- Mutation wrappers: `export const POST = withErrorHandling(async (req) => { ... });`
- GET wrappers: `export const GET = withGetHandler(async (req) => { ... });`
- IDs: `generateId(prefix)` — format: `{prefix}-{timestamp}-{random}`
- Path alias: `@/*` maps to project root
- Client API calls: always use `lib/client-api.ts` typed wrappers — never raw `fetch()` in components
- Modals: always use `<Modal>` from `app/components/shared/Modal.tsx`
- Form modals: track `isDirty`, show `ConfirmDialog` on dirty close
- Tailwind borderRadius tokens: `card` (10px), `badge` (6px), `pill` (9999px) — no other radius tokens
- Tailwind text sizes: `micro` (9px) reserved for decorative-only text inside tight layouts; `xxs` (10px) minimum for functional text
- Toast cap: 5; error toasts 6s, others 4s

## Testing

- **Unit/API tests** (`__tests__/`): Vitest with Node environment. Each test gets an isolated temp `DB_DIR`. Import route handlers directly with constructed `Request` objects.
- **E2E tests** (`e2e/`): Playwright with Chromium. **Must run sequentially** (`workers: 1`). Custom fixture resets DB via `POST /api/backup/restore` before each test. Import `{ test, expect }` from `./fixtures`.
- **E2E selectors**: Scope to `[role="dialog"]` for modal content. Use `#search-input` for search. Use `page.evaluate()` for `?` key dispatch.
- **Accessibility** (`e2e/accessibility.spec.ts`): `@axe-core/playwright` scans dashboard, lighting, audio, setup, and modal views for WCAG 2.0 AA violations. Color-contrast is disabled inside modals (axe mis-computes through semi-transparent backdrop).
- **Test helpers**: `makeProject()`, `makeTask()`, `makeDB()` in `__tests__/helpers/fixtures.ts`; `makeRequest()` in `__tests__/helpers/request.ts`
- **Setup** (`__tests__/setup.ts`): Resets all `globalThis` singletons between tests
- **Coverage thresholds**: 19% lines/statements/branches, 15% functions. CI runs `npm run test:coverage`.
- **Test requests must include Origin header**: CORS is origin-validated — use `makeRequest()` or include `Origin: "http://localhost:3000"` manually.
- Pre-commit hook runs Prettier + ESLint (including `eslint-plugin-security`) on staged files via lint-staged
