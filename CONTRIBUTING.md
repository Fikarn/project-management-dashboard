# Contributing

## Scope

This project is a production-grade local studio console. It is not a generic dashboard starter or an experimental demo. Contributions should preserve:

- live-operator reliability
- clear second-monitor ergonomics
- hardware-specific correctness
- maintainable domain boundaries

If a change improves a secondary feature but increases risk to lighting, audio, setup, startup, shutdown, or persistence, the safer path wins.

## Prerequisites

- Node.js 20
- npm

Initial setup:

```bash
npm install
```

## Development Entry Points

For the native runtime:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:shell:test
npm run native:smoke
npm run native:acceptance
```

For legacy parity comparison or fallback work:

```bash
npm run legacy:seed
npm run legacy:browser:dev
npm run legacy:electron:dev:open
```

Use the legacy Electron path only when touching:

- `electron/*`
- parity comparison against the old operator workflow
- fallback-release readiness
- legacy startup or shutdown behavior that still matters during recovery

## Validation Expectations

Choose validation based on change risk.

### UI-only polish

```bash
npm run lint
npm run build
```

### Logic, routes, persistence, or adapters

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

### Native shell, layout, parity, or commissioning

```bash
npm run lint
npm run native:shell:test
npm run native:smoke
npm run build
npm run test:e2e
```

### Native runtime, persistence, release, or recovery behavior

```bash
npm run lint
npm run typecheck
npm run native:test
npm run native:shell:test
npm run native:acceptance
```

### Release preparation

```bash
npm run release:verify
```

## Repo Conventions

- Keep changes inside the correct layer:
  - `app/components/*` for UI
  - `app/api/*` for request handling
  - `lib/*` for domain logic and adapters
  - `electron/*` for desktop runtime behavior
  - `native/rust-engine/*` for engine-owned native state and commands
  - `native/qt-shell/*` for the native operator shell
  - `docs/*` for durable product and engineering documentation
- Prefer extending the current domain modules over creating cross-cutting “misc” abstractions.
- Avoid accidental hardware writes on mount or view switch.
- Update docs when supported workflows or hardware assumptions change.
- Update `CHANGELOG.md` for user-facing changes.
- If native behavior is intended to match the old Electron app, verify the legacy benchmark before calling the work complete.

## Pull Requests

Every PR should make it easy for a reviewer to answer:

1. What changed?
2. Why was it necessary?
3. What could regress?
4. How was it validated?

Use the PR template. Include screenshots or short clips for UI changes, and call out hardware/manual validation for lighting, audio, setup, or Electron behavior.

## Hardware Awareness

This repo is tuned to the current studio installation, not a generic matrix of devices. Before changing audio, lighting, or commissioning flows, read:

- [docs/HARDWARE_PROFILE.md](docs/HARDWARE_PROFILE.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
