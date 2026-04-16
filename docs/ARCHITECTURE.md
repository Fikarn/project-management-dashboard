# Architecture

## Product Shape

This application is a local-first studio workstation. The primary jobs are:

- lighting control
- audio control
- Stream Deck / Companion control-surface support
- production planning as a secondary workspace

Everything assumes a single trusted machine with no cloud dependency. Supported hardware assumptions are documented in [HARDWARE_PROFILE.md](HARDWARE_PROFILE.md).

## Runtime Layers

### Qt shell

- owns native windowing, startup routing, recovery presentation, and operator-facing shell chrome
- supervises the Rust engine as a child process
- keeps shell view models thin and derived from engine snapshots

### Rust engine

- owns persisted state, schema migrations, and legacy import
- owns planning, commissioning, dashboard, support, lighting, audio, and control-surface contracts
- owns device-facing safety rules, diagnostics, and recovery behavior
- exposes snapshots and commands over the native protocol in `native/protocol/v1.md`

### Native adapters

- lighting adapters stay behind engine-owned health, recall, and failure contracts
- audio adapters stay behind engine-owned sync, recall, and safety contracts
- control-surface exports and bridge behavior stay engine-owned

## Legacy Runtime

The browser/Next and Electron stack still exists in the repo as a compatibility and rollback surface while cleanup continues. It is no longer the release-critical desktop runtime.

## Studio Module Pattern

Any native studio domain should follow the same shape:

### 1. Domain model

- keep persisted values explicit and serializable
- separate persisted configuration from transient connection or probe state
- keep storage ownership in the Rust engine

### 2. Engine contract

- expose a clear snapshot shape
- expose command handlers for every write path
- emit explicit change events when authoritative state mutates

### 3. Shell integration

- request snapshots through the engine controller
- render operator-visible state without owning business logic
- avoid recreating server-style fetch layers inside QML

### 4. Operational status

- expose readiness, failure, and recovery state through engine snapshots
- keep hardware disconnect and recovery behavior visible to the operator
- keep device I/O policy in the engine, not in QML

### 5. Tests

- validate storage and command behavior at the engine boundary first
- add smoke or acceptance coverage for packaged startup, failure, and lifecycle behavior

## Current Module Ownership

- `native/rust-engine/src/planning.rs`: planning storage, snapshots, and mutations
- `native/rust-engine/src/commissioning.rs`: commissioning state and probe flows
- `native/rust-engine/src/lighting.rs`: lighting snapshot, recall, and simulated backend boundary
- `native/rust-engine/src/audio.rs`: audio snapshot, sync, recall, and simulated backend boundary
- `native/rust-engine/src/support.rs`: backup, restore, and diagnostics support flows
- `native/rust-engine/src/control_surface.rs`: Stream Deck bridge and Companion export generation
- `native/qt-shell/qml/Main.qml`: operator shell surface derived from engine state

## Refactor Rule

When adding a feature, define or extend the engine contract first. Only then wire the shell and adapter layers. If a change would move product state or device policy into QML, it is probably going in the wrong direction.
