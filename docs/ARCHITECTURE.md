# Architecture

## Product Shape

This application is a local-first studio workstation. The primary jobs are:

- lighting control
- audio control
- Stream Deck / Companion control surface support
- production planning as a secondary workspace

Everything assumes a single trusted machine with no cloud dependency.
Supported hardware assumptions are documented in [HARDWARE_PROFILE.md](HARDWARE_PROFILE.md).

## Runtime Layers

### Electron shell

- Starts the bundled Next.js server locally
- Owns window state, tray behavior, splash, updater, and shutdown flow
- Keeps the app alive on supported platforms so studio hardware keeps working even if the main window closes

### App router / API

- Serves the React UI
- Exposes local JSON APIs for planning, lighting, audio, backup, Companion, and health
- Persists to the local JSON database through `lib/db.ts`

### Device adapters

- `lib/dmx.ts` handles sACN / DMX output
- `lib/osc.ts` handles OSC send/receive for TotalMix
- `lib/companionExport.ts` generates a Companion profile for this workstation

## Studio Module Pattern

Any new studio domain should follow the same shape as the current lighting and audio modules.

### 1. Domain model

- Add types to `lib/types.ts`
- Keep persisted state serializable and explicit
- Separate persisted values from transient connection state

### 2. API surface

- Add routes under `app/api/<domain>`
- Validate every write request before mutating the database
- Return consistent success and error contracts through `lib/api.ts`

### 3. Client adapter

- Expose a typed client wrapper in `lib/client-api.ts`
- Keep fetch details out of UI components

### 4. UI surface

- Add a focused workspace component under `app/components/<domain>`
- Split the workspace into:
  - toolbar / status
  - content surface
  - settings / modal host
- Avoid new god components

### 5. Operational status

- Expose health/state from the API
- Surface operator-visible status in the workspace toolbar or shell
- Handle disconnect/recovery without requiring an app restart when possible

### 6. Setup path

- If the module requires hardware or commissioning, add it to:
  - `app/components/SetupWizard.tsx`
  - `app/setup/*` if it needs deeper control-surface documentation

### 7. Tests

- Unit/API coverage for route validation and persistence
- E2E coverage for the operator path when the module affects the UI shell

## Current Module Ownership

- `app/components/lighting/*`: lighting operator workflow
- `app/components/audio/*`: audio operator workflow
- `app/components/dashboard/*`: console shell and planning workspace
- `app/components/setup-wizard/*`: workstation commissioning flow
- `electron/*`: desktop lifecycle and packaging behavior

## Refactor Rule

When adding a feature, prefer creating a new file in the correct domain over extending a high-level shell file. If a feature needs to touch shell, API, and device code at once, define the domain contract first, then wire each layer separately.
