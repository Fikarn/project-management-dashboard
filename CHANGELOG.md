# Changelog

All notable changes are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
