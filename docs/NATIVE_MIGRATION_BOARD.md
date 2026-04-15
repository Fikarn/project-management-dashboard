# Native Migration Board

## Purpose

This board turns the architecture plan and parity map into an execution order.

The target is not a second prototype. The target is parity with the current Electron-delivered product on the approved native architecture:

- `Qt/QML` shell
- separate `Rust` engine
- no browser-served renderer
- no `localhost` UI runtime

## Current Status

As of `2026-04-16`, the repo has a working native foundation slice:

- native workspace scaffold
- Qt shell and Rust engine startup handshake
- SQLite bootstrap in the engine
- diagnostics and recovery surface
- engine-owned shell settings and startup routing snapshot
- engine-owned planning workflow parity for read and write flows
- engine-owned commissioning snapshot, probes, and sample-data flows
- engine-owned lighting/audio readiness snapshots, simulated inventory, and sync/recall contracts rendered by the Qt shell
- engine-owned native backup export/restore plus shell-side diagnostics export
- local smoke-test path

What does not exist yet is full product-surface parity. Planning, commissioning, and the core dashboard shell now have real native ownership, and native support plus simulated lighting/audio action flows now exist, but live adapter behavior, control-surface flows, and packaged release gating still remain unported or incomplete.

## Guardrails

- Do not recreate the current `app/api/*` fetch pattern inside QML.
- Do not let QML own product state, persistence, or device logic.
- Do not begin real lighting/audio adapter work before the engine contracts for health, settings, and commissioning are stable.
- Prefer one thin vertical slice at a time over wide native scaffolding across many surfaces.
- Every migrated slice must have:
  - native storage ownership
  - an importer or compatibility path from the current Electron-era data model
  - validation at the engine boundary
  - an explicit parity note in this board

## Exit Gates

Native should not become the default desktop runtime until all of the following are true:

1. packaged native shell + engine boot, fail, and recover deterministically
2. current workstation data can be imported without manual editing
3. planning, commissioning, and dashboard shell are parity-complete
4. lighting and audio adapter boundaries exist with stable health/status contracts
5. backup/restore and diagnostics are available from the native runtime
6. a release process exists for the native runtime, not only for Electron

## Execution Order

1. finish foundation and make it measurable in normal development
2. move persistence ownership into the Rust engine with an importer from `db.json`
3. migrate planning as the first real vertical slice
4. migrate commissioning and dashboard shell behavior
5. add lighting/audio adapter boundaries with simulated backends first
6. migrate backup/restore and health/support flows
7. migrate Stream Deck / Companion export flows last
8. add native packaging, clean-machine verification, and release gating

## Board

| ID    | Workstream                  | Scope                                                                                 | Dependencies             | Exit Criteria                                                                     | Status |
| ----- | --------------------------- | ------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- | ------ |
| `M0`  | Native execution lane       | repo commands, smoke wrapper, CI visibility, docs                                     | existing native scaffold | native path is runnable and validated without ad hoc shell commands               | Done   |
| `M1`  | Foundation exit             | packaged startup verification, lifecycle/error hardening, diagnostics ownership       | `M0`                     | foundation exit gate in the architecture plan is actually satisfied               | Ready  |
| `M2`  | Storage model and importer  | native schema, migrations, importer from current `db.json`, rollback-safe import      | `M1`                     | engine can import current workstation state into native storage deterministically | Done   |
| `M3`  | App core model              | engine-owned app snapshot, dashboard routing, workstation profile, selection defaults | `M2`                     | dashboard/commissioning shell no longer depends on shell-local product state      | Active |
| `M4`  | Planning read parity        | projects/tasks/activity/report snapshots                                              | `M2`, `M3`               | native shell renders real planning data from engine snapshots                     | Done   |
| `M5`  | Planning write parity       | project/task mutations, timer flow, activity updates, tests                           | `M4`                     | planning workflow is usable without the Electron runtime                          | Done   |
| `M6`  | Commissioning parity        | setup state, hardware profile, connection-test contracts, seed/import flows           | `M3`                     | native startup routing and setup completion are fully engine-owned                | Active |
| `M7`  | Dashboard shell parity      | workspace switching, shell state, status strip, support entry points                  | `M3`, `M4`, `M6`         | native dashboard shell matches current operator routing behavior                  | Active |
| `M8`  | Lighting boundary           | engine module, adapter interface, simulated backend, health/status contracts          | `M1`, `M2`               | shell can render lighting readiness and snapshot state without device code in QML | Active |
| `M9`  | Audio boundary              | engine module, adapter interface, simulated backend, health/status contracts          | `M1`, `M2`               | shell can render audio readiness and snapshot state without device code in QML    | Done   |
| `M10` | Support flows               | backup/restore, diagnostics bundle, recovery tooling, health surfaces                 | `M1`, `M2`, `M3`         | native runtime can support install/startup failures and user data recovery        | Active |
| `M11` | Control surface and exports | Stream Deck actions, LCD payloads, Companion export generation                        | `M6`, `M7`, `M8`, `M9`   | native runtime owns all control-surface behavior still in `app/api/deck/*`        | Later  |
| `M12` | Native release path         | packaging, signing, updater strategy, clean-machine QA, release docs                  | `M1`, `M6`, `M7`, `M10`  | native release path exists and is testable as a real desktop product              | Later  |

## Detailed Backlog

### `M0` Native Execution Lane

- [x] Add a repo-native migration board that sequences the work and defines scope.
- [x] Add repo-level `npm run native:*` commands.
- [x] Add a smoke-test wrapper so developers do not need to memorize shell/bundle paths.
- [x] Add a CI job for native foundation validation.
- [x] Upload smoke-test artifacts when the native startup path fails in CI.
- [ ] Add a packaged native smoke path, not only the development-build smoke path.

### `M1` Foundation Exit

- [ ] Verify bundled shell resolves a bundled engine in packaged output, not only `target/debug`.
- [x] Add explicit protocol compatibility handling for version mismatch.
- [ ] Harden lifecycle semantics for restart, graceful shutdown, and watchdog expiry.
- [ ] Add shell-side actions for opening logs and exporting diagnostics.
- [ ] Add packaged startup verification on macOS and Windows.

### `M2` Storage Model and Importer

- [x] Define the first native schema for projects, tasks, activity, app settings, and commissioning.
- [x] Add explicit schema migrations beyond bootstrap version `1`.
- [x] Implement a one-way importer from the current `db.json`.
- [x] Decide how import is triggered on first native launch and how it is retried safely.
- [x] Add importer fixtures derived from realistic workstation data.

### `M3` App Core Model

- [ ] Expand `app.snapshot` from routing-only state into real app-shell state.
- [x] Add engine commands for commissioning completion, hardware-profile updates, and workspace defaults.
- [ ] Remove remaining shell-local assumptions about startup target and persisted state.
- [ ] Keep shell view models thin and derived from engine snapshots only.

### `M4` Planning Read Parity

- [x] Add engine snapshots for projects, tasks, task timers, and activity.
- [x] Map current planning route behavior to native engine commands.
- [x] Render a real planning workspace in QML from native snapshots.
- [x] Port the most valuable planning tests to engine-level coverage first.

### `M5` Planning Write Parity

- [x] Implement create/update/delete/reorder flows for projects and tasks.
- [x] Port project/task form fields for description, priority, due date, and labels into the native shell.
- [x] Port checklist add/toggle/delete flows into engine-owned commands and native shell controls.
- [x] Port timer start/stop/crash-recovery behavior into the engine.
- [x] Emit engine events for changed planning state.
- [x] Validate write-path behavior against current Electron-era expectations.
- [x] Expand the QML planning surface beyond quick actions so update/delete/reorder flows are operator-visible.
- [x] Port selected-project detail, scoped task context, and recent activity views from the Electron Kanban modal into the native shell.

### `M6` Commissioning Parity

- [x] Add engine-owned commissioning stage/profile updates and setup-surface controls for dashboard landing workspace.
- [x] Add engine-owned commissioning steps and persisted probe state, not just a completion flag.
- [x] Define connection-test command contracts for lighting/audio/control surface.
- [x] Port seed/demo-data flows into the engine.
- [ ] Keep startup routing fully driven from engine state after restart.

### `M7` Dashboard Shell Parity

- [x] Replace placeholder workspace summaries with real shell modules.
- [x] Port operator-visible status strip behavior.
- [x] Keep support/recovery entry points reachable from the native dashboard shell.
- [ ] Preserve restored shell state while removing shell-owned product-state drift.

### `M8` Lighting Boundary

- [x] Define engine-side fixture/group/scene/DMX snapshot structures.
- [x] Add a simulated adapter backend for development and CI.
- [x] Define health and failure states before real hardware writes.
- [ ] Keep spatial editor state engine-owned.

### `M9` Audio Boundary

- [x] Define engine-side channel/mix-target/snapshot/metering structures.
- [x] Add a simulated adapter backend for development and CI.
- [x] Define sync, recall, and failure-state contracts before real OSC traffic.
- [x] Keep console safety rules in the engine, not in QML.

### `M10` Support Flows

- [x] Add engine-owned backup/export/import commands.
- [x] Add shell-side diagnostics export.
- [ ] Render operator-visible health and recovery surfaces from engine data only.
- [ ] Verify failure handling on corrupted storage and missing runtime directories.

### `M11` Control Surface and Exports

- [ ] Port Stream Deck selection/action flows after core app and adapter state are stable.
- [ ] Port LCD payload generation and Companion export generation into engine services.
- [ ] Avoid migrating control-surface behavior before commissioning and dashboard ownership are stable.

### `M12` Native Release Path

- [ ] Define the native installer strategy and updater posture.
- [ ] Add clean-machine startup verification for macOS and Windows.
- [ ] Add release acceptance checks for import, restart, and rollback.
- [ ] Remove Electron as the release-critical path only after parity gates pass.

## Active Slice

The active implementation slice for this pass is:

1. keep support, health, and recovery flows native-owned
2. keep device I/O, failure policy, and safety rules in the Rust engine instead of in QML
3. continue closing dashboard-shell and release-path gaps that still block the native runtime from becoming default

The next code slice after this one should reduce one of these remaining blockers:

- define sync/recall/failure contracts on top of the new audio boundary
- finish the operator-visible dashboard status strip and remaining shell-state parity work
- verify packaged startup and bundled-engine resolution outside the development build

## Definition Of "On Track"

The migration is on track only if the next change reduces one of these risks:

- startup uncertainty
- unclear ownership of persisted state
- duplication between Electron and native models
- fragile hardware integration order
- release-path uncertainty

If a change does not reduce one of those risks, it is probably not the next thing to build.
