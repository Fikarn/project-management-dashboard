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
npm run seed
```

## Development Entry Points

```bash
npm run dev
npm run electron:dev:open
npm run electron:dev
```

Use the Electron path when touching:

- `electron/*`
- startup or shutdown behavior
- tray / dock behavior
- packaging or updater flow
- hardware lifecycle handling

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

### Operator workflows, layout, or commissioning

```bash
npm run lint
npm run build
npm run test:e2e
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
  - `docs/*` for durable product and engineering documentation
- Prefer extending the current domain modules over creating cross-cutting “misc” abstractions.
- Avoid accidental hardware writes on mount or view switch.
- Update docs when supported workflows or hardware assumptions change.
- Update `CHANGELOG.md` for user-facing changes.

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

## Automation Notes

`CLAUDE.md` exists as a small automation-facing note for code agents. It should stay short, durable, and aligned with the real source-of-truth docs in `README.md` and `docs/*`.
