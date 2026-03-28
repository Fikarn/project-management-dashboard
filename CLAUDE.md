# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Kanban project management dashboard + studio lighting controller displayed on a secondary monitor. Next.js 14 full-stack app with file-based JSON storage, real-time SSE updates, and Stream Deck+ control via Bitfocus Companion HTTP actions. Controls studio lights (3x Litepanels Astra Bi-Color Soft + 1x Aputure Infinimat 2x4 + 4x Aputure Infinibar PB12) via sACN through a Litepanels Apollo Lightbridge using CRMX wireless DMX. Local-only, no authentication.

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
- **@sentry/nextjs** — error tracking (opt-in via `SENTRY_DSN` env var; inert if unset)
- **@next/bundle-analyzer** — bundle size analysis (`npm run analyze`)
- **Storage:** `data/db.json` (gitignored) — seed to create initial data. `DB_DIR` env var overrides data directory (used by Electron for `userData` path).

## Environment Variables

All optional. Document new ones in `.env.example`.

| Variable | Purpose |
|---|---|
| `DB_DIR` | Override data directory (Electron sets this to `userData/data`) |
| `SENTRY_DSN` | Enables Sentry error reporting in production builds. Omit to disable entirely. |
| `SENTRY_AUTH_TOKEN` | Source map upload in CI (only needed with Sentry) |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry organization/project slugs for CI upload |
| `ANALYZE` | Set to `"true"` to open bundle treemap on next build |

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

Dashboard has a "Lights" view (toggled with `l` key) that controls studio lights via sACN. `lib/dmx.ts` manages a singleton sACN Sender on `globalThis`. Real-time slider drags use in-memory `dmxLiveState` + throttled sACN sends (no disk writes); final values persist to `db.json` on slider release.

**Light type registry** (`lib/light-types.ts`): Single source of truth for hardware specs. Three supported light types:
- **Litepanels Astra Bi-Color Soft**: 2-channel DMX (intensity + CCT), CCT range 3200–5600K
- **Aputure Infinimat 2x4**: 4-channel DMX Profile 2 (CCT 8-bit) — Ch1 intensity, Ch2 CCT, Ch3 ±green/magenta tint, Ch4 strobe (always open). CCT range 2000–10000K
- **Aputure Infinibar PB12**: 8-channel DMX Mode 1 (CCT & RGB — dimmer, CCT, color mix, R, G, B, effect, speed), CCT range 2000–10000K, supports RGB color mode

All lights connect wirelessly to the Apollo Lightbridge via CRMX (LumenRadio). `getCctRange()`, `getChannelCount()`, `supportsRgb()`, `supportsGm()` helpers eliminate hardcoded ranges. RGB-capable lights have a `colorMode` field ("cct" | "rgb" | "hsi") that toggles between CCT, HSI (color wheel), and RGB slider UI. GM-capable lights (Infinimat) have a `gmTint` field (-100 to +100) for green/magenta tint correction.

`checkBridgeReachable()` (`lib/dmx.ts`) does a TCP probe to the Apollo Bridge IP on port 80. `ECONNREFUSED` = reachable (host up, port closed). Used by `/api/lights/status` to return a `reachable` field. `LightingView.tsx` polls `/api/lights/status` every 10s and shows a toolbar indicator (green/red) + per-light "No Signal" badges via `dmxStatus` prop on `LightCard`. Per-light status dots are binary: green = DMX enabled & bridge reachable, red = otherwise.

**Auto-init on page open**: `LightingView` calls `POST /api/lights/init` on mount, which initializes the sACN sender (if not already active) and sends a full DMX frame with all stored light values to sync physical fixtures. This removes the need to manually visit Lighting Settings before controlling lights.

**Light management**: Each `LightCard` has edit (gear) and delete (✕) buttons. Delete shows a `ConfirmDialog` before calling `DELETE /api/lights/[id]`, which also cleans up scene references and selected state.

**Color control**: Three color modes for RGB-capable lights:
- **CCT**: Kelvin slider with quick presets (Tungsten, Halogen, Fluorescent, Daylight, Overcast, Shade) and gel presets (Full/Half/Quarter CTO and CTB). Auto-filtered to light's CCT range.
- **HSI**: Canvas-based circular hue wheel (`HueWheel.tsx`) with inner saturation gradient. Stores R/G/B internally — HSI is purely a UI presentation, not a data model change. DMX output treats "hsi" same as "rgb".
- **RGB**: Per-channel sliders (0–255) with filled color gradients.

**Grand Master fader**: `grandMaster` (0–100) in `LightingSettings`, applied as a multiplier on all dimmer DMX channels in `sendDmxFrame()`. Toolbar fader with RAF-throttled drag. Settings API triggers DMX resend when GM changes.

**Light Groups**: Named groups (e.g., "Key", "Fill") via `LightGroup { id, name, order }`. Lights have `groupId: string | null`. `LightingView` organizes lights by group with collapsible headers, count badges, and group-level power toggle (ON/PARTIAL/OFF). Empty groups are shown with an empty state message (not hidden). Group management (create, rename, delete) is in the sidebar Groups panel; main grid headers only show collapse + power toggle. API: `/api/lights/groups` (CRUD) + PATCH for group-level value changes.

**Compact/Expanded View**: Toggle in sidebar (stored in localStorage). Compact mode renders `CompactLightRow` — single row per light with mini intensity bar, CCT/RGB indicator, edit button, power toggle.

**Sidebar layout**: The lighting page has a right sidebar (`w-72`, `border-l`) separated from the lights grid. Contains: Controls header (view toggles, Add Light, Settings), Scenes panel (`ScenePanel.tsx`), Groups panel (inline in `LightingView.tsx`), and DMX Monitor (togglable). The toolbar only contains left-side controls: All On/Off, Grand Master fader, DMX status indicator.

**Scene management**: `ScenePanel.tsx` shows visual scene cards with color swatch strips. Features: click-to-rename, "Update" to overwrite with current states (PUT with `updateStates: true`), fade recall. Fade duration selector (Instant/1s/2s/3s/5s) triggers server-side interpolation engine (`startFade()` in `lib/dmx.ts`) at ~30fps with ease-in-out curve. Persists final values on completion.

**Effects engine** (`lib/effects.ts`): Per-light effects — Pulse (sine wave), Strobe (hard toggle), Candle (layered flicker). `LightEffect { type: EffectType, speed: number }` on Light. Server-side interval on `globalThis` at 30fps. Speed 1–10 maps to 0.5–5Hz. API: `POST /api/lights/[id]/effect`. LightCard shows FX row + speed slider.

**DMX Output Monitor**: Toggleable panel (`DmxMonitor.tsx`) in sidebar showing real-time DMX channel values grouped by light, with bar visualization and channel labels. `computeChannelData()` extracted from `sendDmxFrame()` for reuse. API: `GET /api/lights/dmx-monitor`. Polls every 500ms when visible.

### Stream Deck+ Integration

Three pages: Projects (page 1), Tasks (page 2), Lights (page 3). `settings.deckMode` tracks "project" or "light" mode. Mode toggle buttons navigate between pages and update the mode.

Server maintains `settings.selectedProjectId` — Stream Deck dials cycle the selection, buttons act on whatever is selected via `POST /api/deck/action` with static JSON payloads. Light mode uses `/api/deck/light-action`. Companion polls `GET /api/deck/lcd` for LCD strip data (handles both project and light keys).

**Stream Deck+ dials** (`/api/deck/dial`): 4 rotary encoders mapped to light parameters. Dial 1 = intensity (rotate %, press = toggle), Dial 2 = CCT (rotate K, press = reset), Dial 3 = Red (RGB lights) or ±G/M tint (Infinimat, press = reset to 0), Dial 4 = Green/Blue (press to cycle, RGB only). Uses live DMX path for real-time feel.

### Timer Storage

Timers store `totalSeconds` + `lastStarted` (ISO string). The client computes live elapsed time via `setInterval` — no server polling. Timer crash recovery runs in `migrateDB()` — if a timer is found still running on startup, elapsed time is added and the timer is stopped. NaN-guarded: malformed `lastStarted` dates produce 0 elapsed rather than corrupting `totalSeconds`.

### SSE Auto-Reconnect

The browser `EventSource` in `Dashboard.tsx` auto-reconnects with exponential backoff (1s → 2s → 4s, cap 10s). On reconnect, it re-fetches all data to sync missed updates. Three connection states: connected (green), connecting (yellow), disconnected (red).

### Modal Architecture

All modals use a shared `<Modal>` wrapper (`app/components/Modal.tsx`) that provides `role="dialog"`, `aria-modal`, focus trapping (Tab/Shift+Tab cycle), auto-focus on mount, and focus restoration on close. Form modals (ProjectForm, TaskForm, LightConfig, LightingSettings) track `isDirty` and show a discard confirmation on backdrop click or Cancel when dirty.

### Setup Wizard / Onboarding

`SetupWizard.tsx` replaces the old `WelcomeModal`. Multi-step wizard shown when `!settings.hasCompletedSetup && projects.length === 0 && !localStorage.hasSeenWelcome`. Steps branch based on use case:
- **PM-only** (4 steps): Welcome → Use Case → Sample Data → Quick Tips
- **PM+Lighting** (9 steps): Welcome → Use Case → Apollo Bridge Setup → CRMX Pairing Guide → DMX Address Assignment → Add Lights → Sample Data → Stream Deck Setup → Quick Tips

The CRMX pairing step has tabbed instructions per fixture type (Astra, Infinimat, Infinibar PB12). The DMX address step auto-assigns channels sequentially with overlap detection.

The wizard sets both `localStorage.hasSeenWelcome` and `POST /api/settings { hasCompletedSetup: true }` on completion. `POST /api/seed` accepts optional `{ preserveLights: true }` to keep lighting config when seeding sample projects.

### Electron Desktop Behavior

- **Splash screen** (`electron/splash.html`): Shows dynamic status messages ("Starting server...", "Loading data...", "Ready") updated via `webContents.executeJavaScript()`. Shows "First launch may take a moment" hint after 5s.
- **macOS close vs quit**: Closing the window keeps the app running (for Companion/lights). A one-time-per-session macOS Notification tells the user. Dock menu has "Open Dashboard" to reopen.
- **Shutdown**: `before-quit` shows a small frameless "Shutting down..." window during the DMX blackout request (up to 2s), then exits.
- **Auto-update** (`electron-updater`): `setupAutoUpdater()` runs only when `app.isPackaged`. Checks silently 3s after startup, then every 4h. On update downloaded, shows a dialog — "Install Now" calls `quitAndInstall()`, "Later" defers to next quit. Auto-update errors are logged silently (no dialog) to avoid disrupting sessions. Requires `--publish always` in CI and a `publish` block in `electron-builder.yml` pointing at the GitHub repo.
- **Code signing**: `electron/entitlements.plist` + `electron/notarize.js` are configured. Notarization skips automatically if `APPLE_ID` env var is unset. For local macOS builds without a cert, use `npm run electron:dist:mac:local` (sets `CSC_IDENTITY_AUTO_DISCOVERY=false`). CI uses `CSC_LINK` + Apple secrets from GitHub repo secrets.

## Data Model (`lib/types.ts`)

Core types: `Project`, `Task`, `ChecklistItem`, `ActivityEntry`, `Settings`, `Light`, `LightGroup`, `LightScene`, `LightSceneEntry`, `LightEffect`, `LightingSettings`. The `DB` interface wraps them all. Projects, tasks, lights, groups, and scenes have `order` fields for manual sorting. Activity log is capped at 500 entries. `Settings.hasCompletedSetup` tracks whether the first-run wizard has been completed.

`DB.schemaVersion` (currently `4`) is written on every save so backup files are self-describing. Increment it in `DEFAULT_DB` and `migrateDB()` whenever the schema changes.

`Light` has: RGB fields (`red`, `green`, `blue` 0-255), `colorMode` ("cct" | "rgb" | "hsi"), `gmTint` (-100 to +100) for Infinimat ±green/magenta correction, `groupId` (nullable FK to `LightGroup`), and `effect: LightEffect | null` for active effects. `LightEffect` has `type` ("pulse" | "strobe" | "candle") and `speed` (1-10). `LightType` is `"astra-bicolor" | "infinimat" | "infinibar-pb12"`. `LightingSettings` includes `grandMaster` (0-100, global intensity multiplier). Hardware specs are in `lib/light-types.ts`.

## Key Directories

- `lib/` — Core utilities: database (`db.ts`), types, event emitter, CORS headers, ID generation, activity logging, DMX control (`dmx.ts`), effects engine (`effects.ts`), backup (`backup.ts`), API error wrapper (`api.ts`)
- `app/api/` — 44 route files (some export multiple HTTP methods). All routes include CORS headers and OPTIONS preflight
- `app/components/` — 24 React components. `Dashboard.tsx` is the main orchestrator (SSE, state, modals, keyboard shortcuts, view toggle). `SetupWizard.tsx` is the first-run onboarding flow. `KanbanBoard.tsx` handles DnD. `LightingView.tsx` handles lighting control (sidebar with controls/groups/scenes, lights grid with group headers, GM fader, effects). `LightCard.tsx` has color-reflective cards with HSI wheel, presets, effects. `HueWheel.tsx` is a canvas-based HSI color picker. `ScenePanel.tsx` has visual scene cards with fade recall. `DmxMonitor.tsx` shows real-time DMX channel values. `Modal.tsx` provides the shared accessible modal wrapper
- `scripts/seed.ts` — Recreates sample data matching current schema
- `electron/` — Electron main/preload process (separate `tsconfig.json`, compiles to `dist-electron/`)

## API Route Categories

- **Projects CRUD:** `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/status`, `/api/projects/reorder`
- **Tasks CRUD:** `/api/projects/[id]/tasks`, `/api/projects/[id]/tasks/[taskId]`, plus `/timer`, `/toggle`
- **Checklists:** `/api/projects/[id]/tasks/[taskId]/checklist/[itemId]`
- **Lights CRUD:** `/api/lights`, `/api/lights/[id]`
- **Light Control:** `/api/lights/[id]/value`, `/api/lights/[id]/effect`, `/api/lights/dmx`, `/api/lights/dmx-monitor`, `/api/lights/all`, `/api/lights/init`, `/api/lights/status`, `/api/lights/shutdown`
- **Light Groups:** `/api/lights/groups`, `/api/lights/groups/[id]` (GET/PUT/DELETE/PATCH)
- **Scenes:** `/api/lights/scenes`, `/api/lights/scenes/[id]`, `/api/lights/scenes/[id]/recall`
- **Lighting Settings:** `/api/lights/settings`
- **Stream Deck:** `/api/deck/action`, `/api/deck/light-action`, `/api/deck/dial`, `/api/deck/select`, `/api/deck/context`, `/api/deck/lcd`, `/api/deck/light-lcd`, `/api/companion-config`
- **Utility:** `/api/settings`, `/api/events` (SSE), `/api/activity`, `/api/reports/time`, `/api/backup`, `/api/backup/restore`, `/api/seed`, `/api/health`

## Reliability & Fault-Tolerance Requirements

This application runs in live recording studios controlling physical lighting fixtures via sACN/DMX. During a session, a crash means lights go dark on camera. Every code change must uphold these non-negotiable principles:

### Zero unhandled exceptions
- **Every** API route handler must be wrapped: mutation routes (POST/PUT/DELETE) with `withErrorHandling()`, GET routes with `withGetHandler()` — both from `lib/api.ts`
- Never add a new route without a wrapper. An unhandled throw in a route handler can crash the server process
- Global process error handlers exist in `lib/process-safety.ts` (loaded via `instrumentation.ts`) — these are the last line of defense, not a substitute for proper error handling
- If `SENTRY_DSN` is set, `process-safety.ts` also fires `captureException` (fire-and-forget, non-blocking). `instrumentation.ts` registers `onRequestError` which captures route handler errors. Sentry is completely inert if `SENTRY_DSN` is not set — do not add any Sentry calls that would throw or break functionality when the env var is absent.

### sACN/DMX must self-heal
- `lib/dmx.ts` has auto-recovery: if the sACN sender is lost, `sendDmxFrame` will attempt reinit (capped at 3/minute)
- On send failure, the sender is destroyed and flagged for reinit on the next call — never leave a broken sender in place
- All DMX sends in route handlers must be wrapped in try-catch — a DMX failure must never prevent the API response or database update from completing
- All IPs and universe numbers must be validated (`isValidIpv4`, `isValidUniverse`) before use

### SSE connections must not leak
- The SSE route (`app/api/events/route.ts`) uses a 30s keepalive ping to detect dead connections
- Cleanup must be idempotent and clear the ping interval
- Browser-side: `Dashboard.tsx` always closes the EventSource in the error handler regardless of readyState, then reconnects with backoff

### Health endpoint is a real probe
`GET /api/health` probes DB readability and returns `{ status: "ok"|"degraded", db: boolean }` with HTTP 200 or 503. Electron's startup loop polls this — a 503 delays the window appearing until the DB is accessible. Do not make it a dummy `{ status: "ok" }` — that defeats the purpose. Do not add a DMX bridge TCP probe here (that's already done by `LightingView` every 10s and would add unnecessary latency to Electron startup).

### Electron must survive server crashes
- Server process auto-restarts on unexpected exit (max 3 restarts/minute)
- Sleep/wake: suspend sends DMX blackout, resume reinitializes DMX after 3s delay
- Unresponsive window handler offers Wait/Reload dialog
- macOS: closing window shows one-time notification; app stays running for Companion/lights
- Quit: shows shutdown feedback window during DMX blackout before exit

### Data writes must never corrupt
- All writes go through `writeDB()` which uses atomic write (`.tmp` + rename)
- `ENOSPC` (disk full) is detected and logged as CRITICAL — `readDB()` returns in-memory default if initial write fails
- `mutateDB()` logs errors in the `.catch()` handler before re-reading from disk
- Backup pruning wraps each `unlinkSync` in try-catch so one failure doesn't skip remaining deletions

### Client-side resilience
- `KanbanBoard` and `LightingView` are wrapped in `<ErrorBoundary>` — a render crash shows a Reload button, not a white screen
- Polling/fetch effects must use `AbortController` and check the abort flag before calling `setState`
- Toast timeouts are tracked in a `useRef<Map>` and cleared on unmount
- Failed reorder operations call `fetchData()` to re-sync the UI

### Input validation at system boundaries
- Backup restore validates: settings is object, each project has id+title strings, each task has id+projectId strings
- Apollo Bridge IP validated with IPv4 regex + octet range check; DMX universe validated [1-63999]
- `withErrorHandling` catches both `SyntaxError` and `TypeError` from malformed request bodies as 400

### Security headers
- `next.config.js` sets X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, and CSP
- `lib/cors.ts` exports `getCorsHeaders(req)` for origin-validated CORS (restricts to localhost)

## Known Pitfalls

These are verified bugs and library quirks discovered during development. Do not reintroduce them.

### sacn library: `useRawDmxValues: true` is mandatory
The `sacn` npm library defaults `useRawDmxValues: false`, treating payload values as percentages (0–100) and multiplying by 2.55 internally. Our DMX functions output raw 0–255 values, so without `useRawDmxValues: true` in the Sender constructor, values above ~100 all clip to 255 (sliders appear to max out at center). Configured in `initDmx()` in `lib/dmx.ts`.

### Slider controlled inputs need local drag state
React controlled `<input type="range">` with `value={light.intensity}` will snap back during drag because the prop doesn't update until the SSE re-fetch cycle completes. Fix: track local `dragging` state per slider key, display local value during drag, clear on mouseUp/touchEnd. See `LightCard.tsx`.

### Live state must not have defaults that shadow DB values
`updateLiveState()` initializes missing entries with `{} as Partial<LiveState>` (not a full object with defaults). If it used `{ on: false, intensity: 0, ... }` as defaults, a slider drag creating `{ intensity: 50 }` would inherit `on: false` and turn the light off. Only explicitly-set fields should exist in live state — `sendDmxFrame` falls through to DB values via `live?.field ?? light.field`.

### Hot-reload doesn't work for server-side DMX code
The sACN sender, `dmxLiveState`, fade state, and effect intervals all live on `globalThis`. Next.js hot-reload creates new module instances but the old `globalThis` references persist. After editing any file in the DMX/effects path (`lib/dmx.ts`, `lib/effects.ts`, `lib/light-types.ts`, etc.), kill all node processes and restart the dev server.

### Infinimat GM tint: DMX 0 = "No Effect", not DMX 133
The Infinimat Profile 2 spec shows DMX 120–145 as "Neutral (0%)" for the ±Green channel, but on the physical fixture this still produces visible tint. DMX 0 (the "No Effect" range) is the correct value for no tint — the fixture ignores the channel entirely. `gmTintToDmx()` maps `null` and `0` to DMX 0.

### Adding new required fields to Light (or any DB type) requires updates in many places
When adding a required field to an interface like `Light`, you must update: (1) `migrateDB()` backfill in `lib/db.ts`, (2) creation route in `/api/lights/route.ts`, (3) `makeLight()` in `__tests__/helpers/fixtures.ts`, (4) all lights in `scripts/seed.ts`, (5) `buildSeedData()` in `/api/seed/route.ts`. Missing any of these causes a type error on build. The migration handles existing `db.json` files but the other locations construct literal objects.

When adding a required field directly to the **`DB` interface** (not a nested type), the 5 locations are different: (1) `DEFAULT_DB` in `lib/db.ts`, (2) `migrateDB()` in `lib/db.ts`, (3) `makeDB()` in `__tests__/helpers/fixtures.ts`, (4) `const db: DB` in `scripts/seed.ts`, (5) `buildSeedData()` in `/api/seed/route.ts`. Also increment `schemaVersion` when making structural changes.

## Conventions

- All new API routes must return `corsHeaders` and handle `OPTIONS`
- All mutation handlers (POST/PUT/DELETE) must be wrapped: `export const POST = withErrorHandling(async (req) => { ... });`
- All GET handlers must be wrapped: `export const GET = withGetHandler(async (req) => { ... });`
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
- **E2E tests** (`e2e/`): Playwright with Chromium against a live dev server. **Must run sequentially** (`workers: 1`) because all tests share one server/DB.
- **E2E isolation** (`e2e/fixtures.ts`): Custom `test` fixture resets the DB via `POST /api/backup/restore` before each test with a clean state (`hasCompletedSetup: true`, `dashboardView: "kanban"`). All E2E specs import `{ test, expect }` from `./fixtures` instead of `@playwright/test`.
- **E2E selector rules**: Scope locators to `[role="dialog"]` when testing modal content to avoid matching toasts/activity entries. Use `#search-input` for the search field, not generic `input[type="text"]`. Use `page.evaluate()` to dispatch `KeyboardEvent` for `?` key (Shift+/ unreliable in headless Chromium).
- **Test helpers**: `makeProject()`, `makeTask()`, `makeDB()` in `__tests__/helpers/fixtures.ts`; `makeRequest()` in `__tests__/helpers/request.ts`
- **Setup** (`__tests__/setup.ts`): Resets all `globalThis` singletons between tests (`dbWriteChain`, `lastAutoBackup`, `eventEmitter`, DMX state, fade state, effect loop state)
- Run `npm test` to verify changes pass; `npm run build` for type-checking
- Pre-commit hook runs Prettier + ESLint on staged files via lint-staged
