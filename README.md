[![CI](https://github.com/Fikarn/project-management-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/ci.yml)
[![Release](https://github.com/Fikarn/project-management-dashboard/actions/workflows/release.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/release.yml)
[![CodeQL](https://github.com/Fikarn/project-management-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/codeql.yml)

# Studio Console

Studio Console is a local-first desktop control application for a fixed studio workstation. It combines production planning, lighting control, audio control, and Stream Deck commissioning into one operator-facing surface designed to stay open full-time on a dedicated second monitor.

This repository is intentionally optimized for a specific deployment profile rather than a generic SaaS dashboard:

- desktop-first, local-only operation
- permanent 27-inch 16:9 second-monitor layout
- live lighting and audio control under time pressure
- fixed studio hardware assumptions instead of broad hardware abstraction

## Product Surface

### Planning

- dense Kanban workspace for always-visible production tracking
- keyboard-first project and task operations
- timer, status, and priority visibility without consuming the whole console

### Lighting

- fixture control for the current studio lighting rig
- compact grid/list operator views plus a polished 2D studio plot
- DMX status visibility, scenes, grouping, and live spatial editing

### Audio

- fixed RME Fireface UFX III control surface
- front preamps `9-12`, rear line inputs `1-8`, software playback returns, and output-mix control
- main monitor and headphone mix workflows aligned to TotalMix FX concepts
- explicit safety model for live sync, recall, and phantom power handling

### Setup / Commissioning

- import-first Companion / Stream Deck setup workflow
- workstation-specific control-surface documentation
- commissioning layout that matches the production console language

## Hardware Profile

This project is deliberately tuned to the current studio installation.

- Display: dedicated second monitor, target `2560x1440`, minimum `1920x1080`
- Audio interface: RME Fireface UFX III
- Lighting bridge: Litepanels Apollo Bridge
- Control surface: Stream Deck+
- Companion workflow: local Bitfocus Companion instance

Full deployment assumptions live in [docs/HARDWARE_PROFILE.md](docs/HARDWARE_PROFILE.md).

## Repo Map

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): runtime and domain boundaries
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): day-to-day engineering workflow
- [docs/OPERATIONS.md](docs/OPERATIONS.md): local operations and operator support
- [docs/RELEASE.md](docs/RELEASE.md): versioning, tagging, and GitHub release flow
- [docs/HARDWARE_PROFILE.md](docs/HARDWARE_PROFILE.md): supported studio hardware and scope

## Getting Started

### Prerequisites

- Node.js 20
- npm

### Local Development

```bash
npm install
npm run seed
npm run dev
```

The browser app runs locally at [http://localhost:3000](http://localhost:3000).

### Electron Development

```bash
npm run electron:dev:open
```

Use the Electron path for startup, shutdown, tray, updater, or packaging work.

## Common Commands

```bash
npm run clean
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test:coverage
npm run test:e2e
npm run ci
```

`npm run clean` removes generated local artifacts such as `.next`, coverage output, packaged Electron output, Playwright reports, and release build folders.

### Standalone Production Server

The repo uses Next.js standalone output. After `npm run build`, run:

```bash
npm run start:standalone
```

Set `HOSTNAME` and `PORT` as needed before starting the standalone server.

## Release Model

Releases are changelog-driven and tag-driven.

1. Land changes on `main`
2. Bump `package.json` / `package-lock.json`
3. Move release notes from `[Unreleased]` into a versioned `CHANGELOG.md` section
4. Run `npm run release:verify`
5. Commit release metadata
6. Push `main`
7. Create and push a `vX.Y.Z` tag

The release workflow validates metadata, creates GitHub release notes from `CHANGELOG.md`, and builds platform installers.

See [docs/RELEASE.md](docs/RELEASE.md) for the full flow.

## Engineering Standards

- local-first reliability beats feature breadth
- operator clarity beats decorative UI
- hardware-facing changes require explicit validation
- no silent live-state writes on screen open unless that behavior is intentional and documented
- repo docs should reflect the actual supported hardware and workflows

## License

[MIT](LICENSE)
