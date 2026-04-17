# Changelog

All notable changes are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [2.0.0] — 2026-04-17

### Added

- Native-first desktop runtime covering planning, lighting, audio, commissioning, support, backup/restore, and Companion export through the Qt/QML shell plus Rust engine
- Offline native installers, maintenance-tool update repositories, per-platform `SHA256` manifests, and release verification gates for packaged smoke, staged delivery, installer acceptance, and continuity
- Native support tooling for runtime paths, diagnostics export, packaged acceptance, and structured installer/update artifact validation

### Changed

- Tagged releases now ship the native macOS and Windows product instead of the legacy Electron desktop path
- The browser/Next.js and Electron runtime are now explicitly treated as archival reference and rollback surfaces, with `legacy:*` commands for intentional use
- Release notes, repo guidance, and operator rollout documentation now describe controlled unsigned workstation deployment as the supported production posture

### Fixed

- Packaged smoke and release-artifact verification now use structured status and checksum validation instead of brittle log scraping
- Native packaging and staging now preserve bundle integrity more reliably and emit cleaner diagnostics during local release verification

## [1.14.0] — 2026-04-14

### Added

- Desktop app About surface with packaged version info, manual update checks, and an operator-facing open-at-login toggle
- Productization planning, release, and operations documentation for packaged installer workflows and clean-machine verification
- Local unsigned Windows packaging command for validating NSIS installer artifacts before code signing is configured

### Changed

- Locked the packaged product identity to `SSE ExEd Studio Control` with the final app identifier `com.sse.exedstudiocontrol`
- Reworked the repo landing page and release guidance around installer downloads, update behavior, and operator expectations
- Closing the main window now warns and then fully quits on both Windows and macOS instead of leaving the app running in the background
- Companion profile exports and setup messaging now use the current product name consistently
- Removed stale repo process artifacts, added a generated-artifact cleanup script, and reduced automation metadata/docs to a smaller durable set

### Fixed

- Windows local packaging no longer fails by trying to run the macOS ad-hoc signing hook during `electron-builder --win`
- Unsigned Windows packaging now produces the expected installer and updater metadata artifacts for local verification

## [1.13.0] — 2026-04-14

### Added

- Fixed-height second-monitor console shell across dashboard, planning, lighting, audio, and setup
- Production-grade studio plot for lighting with operator rail, selection HUD, viewport controls, framing presets, and safer quick actions
- Fireface UFX III console model with front preamps `9-12`, rear line inputs `1-8`, software playback returns, and explicit `Main Out` / `Phones 1` / `Phones 2` mix selection
- Explicit audio console confidence model, live meter trust states, and deliberate sync path for safer TotalMix operation
- Commissioning workspace for setup with a denser Stream Deck+ replica, support rail, and structured wizard frame
- Viewport-fit, spatial, audio-console, and accessibility E2E coverage for the operator surfaces
- Repository governance improvements: hardware profile documentation, CodeQL workflow, issue intake configuration, stronger PR template, and tighter Git ignore / attributes rules
- Changelog-driven release validation and release-note extraction scripts for tag safety and repeatable GitHub releases

### Changed

- Dashboard, planning, lighting, audio, and setup now share a more consistent console design language for panel rhythm, summary cards, toolbar treatment, and status visibility
- The audio workspace now reflects the actual live studio deployment instead of a generic channel CRUD model
- Setup/onboarding now behaves like a fixed commissioning console instead of a document-style page
- README, contributor guidance, and repository-facing documentation now describe the current product and hardware assumptions more accurately
- Standalone startup flow is now aligned with Next.js standalone output, and Playwright uses the same production-style server path
- CI now validates release metadata on every change, and the release workflow gates platform builds behind a single validation job
- Tagged releases can now be rebuilt manually through `workflow_dispatch` without inventing a new version

### Fixed

- Planning lanes are now keyboard-focusable scroll regions
- Audio sliders now have explicit labels and strip selection no longer relies on nested interactive containers
- Accessibility gaps across the shared shell and audio surface that were still failing the full axe suite
- View-state persistence and cross-view shell behavior that could conflict with the new fixed-layout console

## [1.12.0] — 2026-04-12

### Added

- Typed request DTOs for all API endpoints — replaces `Record<string, unknown>` with 20+ domain-specific interfaces (`CreateProjectRequest`, `UpdateLightRequest`, `SendOscRequest`, etc.)
- Generic `RouteContext` type and typed `withErrorHandling<C>` / `withGetHandler<C>` wrappers — eliminates `ctx: any` from all route handlers
- Dashboard decomposition — split 927-line god component (28 `useState`) into 3 focused context providers (`DashboardDataContext`, `KanbanActionsContext`, `DashboardUIContext`) with a thin rendering shell
- Memoized `tasksByProject` Map for O(T) search result counting (was O(P×T) per render)
- Error toasts on silent catches in `ProjectDetailModal` (activity load), `TimeReport` (data fetch)
- 7 new API test files with 144 tests covering deck actions, light control, light groups/scenes, audio channels, project reorder/status, and misc endpoints
- Test coverage raised from 19% to 62% lines (55% branches, 56% functions)

### Changed

- All handlers in context providers wrapped with `useCallback` for stable references
- Coverage thresholds raised to 60% lines/statements, 55% branches/functions

### Fixed

- `as any` casts removed from `electron/main.ts` (5 instances) — proper `ChildProcess` typing and `process.kill(pid, signal)` for cross-type signals
- `as any` cast removed from `AudioFader.tsx` — `writingMode: "vertical-lr"` is valid in modern TypeScript DOM lib
- CCT clamping test used wrong range for astra-bicolor (was 2800–6500, corrected to 3200–5600)

## [1.11.0] — 2026-04-12

### Added

- Hold-to-confirm for destructive live actions — All Off (2s), scene recall (1.5s), snapshot recall (1.5s) via new `HoldButton` component
- Operator readability mode — S/M/L UI scale toggle persisted in localStorage
- Unified SSE/DMX/OSC health strip in persistent header, visible from all views
- Sticky Kanban FilterBar with search result counts
- Named step indicator in Setup Wizard (replaces dot navigation), closeable with skip confirmation

### Fixed

- Modal Escape key bypassing dirty-state protection — Escape now routes through each modal's `onClose` handler
- Theme token consistency on error/404 pages
- Focus-within and touch fallbacks on hover-only action buttons

## [1.10.0] — 2026-04-12

### Added

- WCAG 2.0 AA accessibility overhaul across all views (Kanban, Lighting, Audio, Setup)
- Form accessibility — all `<label>` elements bound with `htmlFor`/`id` across 10 form files
- Toggle semantics — `aria-pressed`, `role="switch"`, `role="tablist"`/`role="tab"` on interactive controls
- Keyboard and touch accessibility — edit/delete actions visible on `focus-within` and touch devices
- Visible status filter chip row in FilterBar with `aria-keyshortcuts`
- `activeText` prop on `AudioToggleButton` for WCAG-passing dark-background combos
- `scripts/audit-contrast.ts` dev tool for verifying contrast ratios
- Extended accessibility E2E tests covering audio view, setup page, and modal state

### Changed

- Lifted `studio-500` and `studio-400` palette tokens to pass AA 4.5:1 contrast on all backgrounds
- Replaced all `gray-*`/`blue-*`/`green-*` tokens in Setup pages with `studio-*`/`accent-*`
- Bumped 51 of 52 `text-micro` (9px) usages to `text-xxs` (10px) for functional text

### Fixed

- Re-enabled axe color-contrast checks (previously disabled) on all page-level specs

## [1.9.0] — 2026-04-10

### Added

- Audio mixer view — controls RME Fireface UFX III via OSC through TotalMix FX
- `lib/osc.ts` — OSC communication layer with auto-recovery (mirrors DMX singleton pattern)
- 13 API routes under `/api/audio` for channels, snapshots, settings, and metering
- 8 audio UI components (mixer console layout with vertical channel strips)
- 3 custom hooks (`useOscPolling`, `useAudioControls`, `useMeterPolling`)
- Stream Deck+ page 4 with gain dials, mute/phantom buttons, snapshot recall
- Configurable audio channels with full preamp control (gain, fader, mute, solo, phantom 48V, phase, pad, lo-cut)
- Schema v7 with full migration backfill for existing databases

## [1.8.0] — 2026-04-09

### Added

- Top-level `AppErrorBoundary` — full-screen crash fallback wrapping the entire app (no more white screens)
- Initial load failure retry UI with exponential backoff (1s/2s/4s, max 5 attempts)
- Extended SSE disconnect notification — persistent toast after 15s, "Connection restored" on reconnect
- DMX send failure user feedback — throttled error toast in lighting view
- Rotation, marker position, and grand master save error toasts
- DMX address overlap detection — prevents two lights from sharing channels
- DMX address range validation — rejects out-of-range addresses with clear error messages
- Light type validation — rejects unknown types instead of silently defaulting
- Light name length limit (50 chars) enforced server-side and client-side
- `DiskFullError` class with 507 HTTP status for disk-full conditions
- Backup health tracking — failure counter and `getBackupHealth()` export
- SSE `db-error` event — database read failures send error events instead of disconnecting
- Activity log HTML sanitization on detail field
- Effect loop auto-pause after 3 consecutive DMX failures, auto-resume on recovery
- DMX auto-reinit rate-limit logging and `isDmxRecoveryExhausted()` getter
- Backup recovery loop capped at 20 files to prevent runaway scans
- CORS hardening — all routes use origin-validated `getCorsHeaders(req)` restricting to localhost (replaces wildcard `Access-Control-Allow-Origin: *`)
- `eslint-plugin-security` for static analysis of unsafe patterns
- Vitest coverage thresholds enforced in CI
- Stale issue/PR automation (`.github/workflows/stale.yml`)
- Accessibility E2E tests via `@axe-core/playwright`
- Repository metadata — `SECURITY.md`, `CODEOWNERS`, `.editorconfig`, CI badge, `package.json` fields

### Fixed

- `TypeError` no longer misclassified as 400 Bad Request — real app bugs now correctly return 500
- Electron server startup timeout increased from 15s to 30s with progressive splash messages
- Electron DMX shutdown timeout increased from 2s to 5s with timeout warning
- Electron splash screen status uses `JSON.stringify()` to prevent code injection via special characters
- ErrorBoundary `onRetry` prop — inline "Reload" refetches data instead of just clearing error state
- ESLint warnings resolved: missing `useCallback` deps, `<img>` replaced with Next.js `<Image>`

## [1.4.0] — 2026-03-24

### Added

- HSI canvas-based circular hue wheel (`HueWheel.tsx`) for RGB-capable lights
- Grand Master fader — global intensity multiplier (0–100%) in toolbar, applied to all dimmer channels in real time
- Light groups — organize lights into named groups (Key, Fill, etc.) with collapsible headers, count badges, and group-level ON/PARTIAL/OFF power toggle
- Compact/expanded view toggle — single-row compact mode per light (persisted in localStorage)
- Effects engine — per-light Pulse (sine wave), Strobe (hard toggle), and Candle (layered flicker) effects running server-side at 30fps with speed control (1–10)
- Scene fade recall — configurable fade duration (Instant/1s/2s/3s/5s) with server-side ease-in-out interpolation
- DMX Output Monitor — toggleable sidebar panel showing real-time channel values grouped by fixture with bar visualization (polls every 500ms)
- Visual scene cards with color swatch strips and click-to-rename
- API endpoints: `/api/lights/groups`, `/api/lights/groups/[id]`, `/api/lights/[id]/effect`, `/api/lights/dmx-monitor`

## [1.3.0] — 2026-03-24

### Added

- Auto-init DMX on Lighting view open — sACN sender initializes and syncs all fixture states automatically; no manual setup step required
- Light delete button with confirmation dialog on each `LightCard`
- Simplified bridge status indicator in toolbar (green/red dot)

## [1.2.0] — 2026-03-23

### Added

- Aputure Infinimat 2×4 support — 4-channel DMX Profile 2 (intensity, CCT, ±green/magenta tint, strobe; CCT 2000–10000K)
- GM tint control — per-light green/magenta correction slider (−100 to +100) for the Infinimat
- `gmTintToDmx()` — maps null/0 to DMX 0 ("No Effect") per fixture spec

### Fixed

- sACN `useRawDmxValues: true` — values above ~100 were being multiplied by 2.55 internally, causing sliders to max out at center position

## [1.1.0] — 2026-03-23

### Added

- Aputure Infinibar PB12 support — 8-channel DMX Mode 1 (intensity, CCT, color mix, R/G/B, effect, speed; CCT 2000–10000K, RGB-capable)
- Light type registry (`lib/light-types.ts`) — single source of truth for per-fixture DMX specs
- RGB color mode — per-channel R/G/B sliders (0–255) for RGB-capable fixtures
- CCT/RGB mode toggle on RGB-capable lights; `colorMode` field on `Light`
- Stream Deck+ dial support — 4 rotary encoders mapped to light parameters via `/api/deck/dial`

## [1.0.1] — 2026-03-20

### Fixed

- TypeScript error TS2339 in Electron build — `mainWindow` type narrowing after `createWindow()`

## [1.0.0] — 2026-03-20

### Added

- Setup Wizard replacing `WelcomeModal` — multi-step first-run onboarding (4 steps PM-only, 9 steps PM+Lighting)
- CRMX pairing guide with tabbed instructions per fixture type
- DMX address assignment step with overlap detection
- `hasCompletedSetup` setting; `POST /api/seed` accepts `{ preserveLights: true }`
- Per-test E2E DB isolation via `POST /api/backup/restore` fixture

## [0.10.0] — 2026-03-20

### Added

- `withErrorHandling()` / `withGetHandler()` wrappers — all 40+ routes covered; unhandled throws can no longer crash the server
- Global `uncaughtException` / `unhandledRejection` handlers in `lib/process-safety.ts`
- `writeDB()` atomic writes via `.tmp` + `rename`; `ENOSPC` detection and logging
- Corruption recovery in `readDB()` — scans backups, falls back to `DEFAULT_DB`
- Auto-backups every 30 min via `maybeAutoBackup()` (keeps 10 rolling backups)
- SSE keepalive ping (30s) and exponential backoff reconnect (1s → 10s cap)
- Electron: auto-restart on server crash (max 3/min), sleep/wake DMX handling, unresponsive window dialog
- Security headers: CSP (dev/prod split), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`
- CORS validation via `getCorsHeaders(req)` (restricts to localhost)
- `ErrorBoundary` around `KanbanBoard` and `LightingView`
- Apollo Bridge TCP reachability probe and per-light "No Signal" badges
- Timer crash recovery in `migrateDB()`

## [0.9.0] — 2026-03-20

### Added

- Automated testing: Vitest (unit/API) + Playwright (E2E) with per-test DB isolation
- ESLint (Next.js rules), Prettier, Husky + lint-staged pre-commit hooks
- CI pipeline: lint, format check, build, unit tests, E2E tests on push/PR to `main`
- Fast Electron dev workflow (`electron:dev:open`)
- Apollo Bridge reachability detection (TCP probe, per-light status dots)

## [0.7.0] — 2026-03-19

### Fixed

- NaN guard on timer `lastStarted` — malformed dates produce 0 elapsed rather than corrupting `totalSeconds`
- `mutateDB()` promise chain survives write errors; callers still receive the error
- DMX sender auto-recovery on send failure (capped at 3 reinit attempts/minute)
- SSE route cleanup is idempotent; no interval leak on disconnect

## [0.6.0] — 2026-03-19

### Added

- Accessible modals — shared `<Modal>` wrapper with focus trapping, `role="dialog"`, `aria-modal`, auto-focus, focus restoration
- `isDirty` tracking on form modals with discard confirmation
- Toast notifications with stacking limit, error-specific timeouts, and accessibility
- SSE exponential backoff reconnect
- Electron window state persistence (size, position, maximized)

## [0.5.0] — 2026-03-19

### Added

- Studio lighting control via sACN/E1.31 through Litepanels Apollo Bridge
- `lib/dmx.ts` — singleton sACN Sender on `globalThis`, in-memory `dmxLiveState`, throttled sends
- Per-light intensity and CCT sliders with real-time DMX output
- Light scenes — save and recall presets across all lights
- Stream Deck+ Lights page with all-on/off and scene recall actions
- `/api/lights/*` route family

## [0.4.0] — 2026-03-19

### Added

- Windows support — NSIS installer, system tray (hide-to-tray on close, Quit from tray)
- CI/CD — GitHub Actions release workflow builds macOS DMG + Windows NSIS installer on `v*` tags

## [0.3.0] — 2026-03-19

### Added

- Stream Deck+ LCD strip feedback — Companion polls `/api/deck/lcd` for real-time display data

## [0.2.0] — 2026-03-19

### Added

- Stream Deck+ 2-page layout (Projects + Tasks), task selection via dials
- Dashboard project highlighting for selected project
- `electron-builder` switched to `utilityProcess` for reliable server spawning

## [0.1.0] — 2026-03-19

### Added

- Electron desktop app for macOS (arm64 DMG) with splash screen and window state persistence
- Stream Deck+ context-aware action API (`/api/deck/action`, `/api/deck/select`)
- Bitfocus Companion config export endpoint (`/api/companion-config`)
