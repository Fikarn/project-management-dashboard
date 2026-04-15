# Native Parity Map

## Purpose

This document maps the current Electron-era product surface to the approved native target:

- `Qt/QML` shell
- separate `Rust` engine
- no `localhost` UI runtime

The goal is parity of operator-visible behavior, not a code-for-code rewrite.

## Parity Rules

- Every current product surface must have one native owner.
- Runtime-critical behavior belongs in the Rust engine, not in QML.
- QML screens render engine-owned snapshots and invoke explicit commands.
- Foundation is not complete until this map exists and the first shared snapshot is exercised by the shell.

## Current Product Surface Inventory

| Surface                                 | Current entry points                                                                         | Current route families                                                                                 | Native target                                                                                     | Phase            |
| --------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------- |
| Dashboard shell                         | `app/components/Dashboard.tsx`, `app/components/dashboard/*`                                 | `app/api/view`, `app/api/settings`, `app/api/events`                                                   | `qt-shell/ui/dashboard/*` + engine `app`, `settings`, `events`                                    | Foundation       |
| Planning workspace                      | `app/components/dashboard/DashboardKanbanWorkspace.tsx`, `app/components/kanban/*`           | `app/api/projects/*`, `app/api/activity`, `app/api/reports/time`                                       | engine `planning`, `activity`, `reporting`; shell `ui/planning/*`                                 | Early migration  |
| Lighting workspace                      | `app/components/lighting/*`, `app/components/lighting/spatial/*`                             | `app/api/lights/*`, `app/api/lights/groups/*`, `app/api/lights/scenes/*`, `app/api/lights/dmx-monitor` | engine `lighting`, `lighting::groups`, `lighting::scenes`, `lighting::dmx`; shell `ui/lighting/*` | Early migration  |
| Audio workspace                         | `app/components/audio/*`                                                                     | `app/api/audio/*`, `app/api/audio/mix-targets/*`, `app/api/audio/snapshots/*`                          | engine `audio`, `audio::mix_targets`, `audio::snapshots`, `audio::metering`; shell `ui/audio/*`   | Early migration  |
| Commissioning workspace                 | `app/setup/SetupPage.tsx`, `app/components/SetupWizard.tsx`, `app/components/setup-wizard/*` | `app/api/settings`, `app/api/seed`, `app/api/companion-config`, lighting/audio status/init routes      | engine `commissioning`, `seed`, `exports`, adapter health; shell `ui/commissioning/*`             | Foundation       |
| Stream Deck / Companion control surface | `app/setup/deckConfig.ts`, `app/setup/StreamDeckReplica.tsx`                                 | `app/api/deck/*`, `app/api/companion-config`                                                           | engine `control_surface`, `exports`; shell `ui/commissioning/control-surface/*`                   | Active migration |
| Backup and restore                      | UI is currently dashboard/support-driven                                                     | `app/api/backup`, `app/api/backup/restore`                                                             | engine `backup_restore`; shell `ui/support/backup/*`                                              | Foundation       |
| Health and diagnostics                  | `app/components/shared/SystemHealthStrip.tsx`, `DashboardStatusScreen.tsx`                   | `app/api/health`, `app/api/lights/status`, `app/api/audio/status`                                      | engine `health`, `diagnostics`; shell `ui/support/health/*`                                       | Foundation       |
| App settings and selection state        | `DashboardDataContext.tsx`, `DashboardUIContext.tsx`                                         | `app/api/settings`, `app/api/view`, deck selection routes                                              | engine `settings`, `app`; shell `adapters/AppStateViewModel`                                      | Foundation       |

## Cross-Cutting Runtime Services

These are not user-facing workspaces, but they are required for parity because the current product depends on them.

| Runtime service          | Current implementation hints                                  | Native owner                                                | Phase           |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- | --------------- |
| Persistent store         | `lib/db.ts`, `lib/backup.ts`, current JSON/db helpers         | engine `storage`, `migrations`, `backup_restore`            | Foundation      |
| Event propagation        | `app/api/events/route.ts`, polling hooks, dashboard providers | engine `events`; shell transport/adapters                   | Early migration |
| Startup gating           | current Electron server boot + dashboard initial-load retry   | shell `bootstrap`, engine `app.snapshot`, `health.snapshot` | Foundation      |
| Diagnostics and recovery | current fallback screens, installer help, health strip        | shell `diagnostics`, engine `health` and structured logs    | Foundation      |
| Hardware adapters        | `lib/dmx.ts`, `lib/audio-console.ts`, `lib/osc.ts`            | engine `lighting::adapter`, `audio::adapter`                | Early migration |
| Seed / demo data         | `lib/seed-data.ts`, `app/api/seed/route.ts`                   | engine `seed`                                               | Early migration |

## Native Module Ownership

### Foundation-owned now

These modules are required before deeper feature migration can proceed safely:

| Native module       | Responsibilities                                                        | Current evidence                            |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| `engine.app`        | startup snapshot, workspace selection defaults, commissioning gate      | current shell settings + new `app.snapshot` |
| `engine.storage`    | SQLite bootstrap, migrations, integrity check, settings persistence     | existing Rust storage scaffold              |
| `engine.health`     | startup health, adapter placeholders, diagnostics metadata              | existing `health.snapshot`                  |
| `shell.engine`      | process supervision, watchdogs, recovery flow, app snapshot consumption | existing Qt `EngineProcess`                 |
| `shell.ui.recovery` | failure surface, retry, diagnostics path rendering                      | existing QML scaffold                       |

### Early migration modules

These are the first product slices that should be migrated after foundation exit:

| Native module          | Current surface it replaces                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `engine.planning`      | projects, tasks, timers, activity, reports                          |
| `engine.lighting`      | fixtures, scenes, groups, DMX status, spatial state                 |
| `engine.audio`         | channels, mix targets, metering, snapshots, console sync            |
| `engine.commissioning` | setup completion, workstation profile, connection tests, seed flows |
| `shell.ui.dashboard`   | dashboard shell and workspace switching                             |

### Late migration modules

These require stable domain data first and should not lead the migration:

| Native module               | Current surface it replaces                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `engine.control_surface`    | Stream Deck button/dial actions, LCD payloads, selection commands |
| `engine.exports`            | Companion profile generation and related support artifacts        |
| `shell.ui.advanced_support` | rich support tooling beyond basic diagnostics/recovery            |

## Gap Check Against Foundation Exit Gate

| Foundation requirement                                                   | Status      | Evidence                                                                                          |
| ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| Native shell and engine boot/fail/recover deterministically              | In progress | Qt shell watchdog and recovery surface exist; packaged verification still missing                 |
| Runtime directories, logging, diagnostics, smoke tests stable            | In progress | development smoke test exists; packaged release path still missing                                |
| Protocol, lifecycle, and error ownership explicit enough for domain work | In progress | v1 protocol exists; lifecycle and error taxonomy are being hardened                               |
| Engine owns persistence, shell does not invent product state             | In progress | shell settings persist in engine; app-level commissioning/dashboard snapshot now being introduced |
| Current product surface is explicitly mapped to native modules           | Complete    | this document                                                                                     |

## Immediate Implications

- The next engine-owned UI-driving snapshot after foundation should be the dashboard/commissioning shell state, not another shell-local preference.
- Planning, lighting, and audio migrations should land behind engine modules, not by recreating React-era fetch patterns inside QML.
- Stream Deck and Companion export flows now belong to the native runtime, and the remaining work is closing the still-unported deck-triggered lighting/audio mutations without reintroducing Electron HTTP ownership.
