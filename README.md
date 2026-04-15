[![CI](https://github.com/Fikarn/project-management-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/ci.yml)
[![Release](https://github.com/Fikarn/project-management-dashboard/actions/workflows/release.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/release.yml)
[![CodeQL](https://github.com/Fikarn/project-management-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/Fikarn/project-management-dashboard/actions/workflows/codeql.yml)

# SSE ExEd Studio Control

SSE ExEd Studio Control is a local-first desktop control application for a fixed studio workstation. It combines production planning, lighting control, audio control, and Stream Deck commissioning into one operator-facing surface designed to stay open full-time on a dedicated second monitor.

This repository is intentionally optimized for a specific deployment profile rather than a generic SaaS dashboard:

- desktop-first, local-only operation
- permanent 27-inch 16:9 second-monitor layout
- live lighting and audio control under time pressure
- fixed studio hardware assumptions instead of broad hardware abstraction

## Distribution Targets

- Windows 11 `x64` packaged with NSIS
- macOS Apple Silicon packaged as DMG
- GitHub Releases as the installer and auto-update backend
- One fixed studio workstation as the primary production target

## Download

Installer builds are published through [GitHub Releases](https://github.com/Fikarn/project-management-dashboard/releases/latest).

- Windows: install the generated `.exe` installer
- macOS: open the Apple Silicon `.dmg`, then move the app into `Applications`
- Updates: packaged apps check GitHub Releases for updates and install downloaded updates when the app fully quits

Productization work and release gates are tracked in [docs/PRODUCTIZATION_PLAN.md](docs/PRODUCTIZATION_PLAN.md) and [docs/RELEASE.md](docs/RELEASE.md).

## Operator Lifecycle

- First launch starts the bundled local server, waits for health checks, then loads the console
- First-run commissioning is available from inside the app for planning, lighting, and Companion setup
- Closing the main window shows a warning and then fully quits the app if confirmed
- Packaged builds default to opening at login, and the operator can change that inside the app
- User data stays local on the workstation and survives reinstall/update flows unless manually removed

Operator support details live in [docs/OPERATIONS.md](docs/OPERATIONS.md).

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

- [docs/PRODUCTIZATION_PLAN.md](docs/PRODUCTIZATION_PLAN.md): current production-readiness plan and open decisions
- [docs/DESKTOP_ARCHITECTURE_PLAN.md](docs/DESKTOP_ARCHITECTURE_PLAN.md): approved end-state Qt/QML + Rust architecture plan
- [docs/NATIVE_PARITY_MAP.md](docs/NATIVE_PARITY_MAP.md): parity target from the current Electron app to native modules and screens
- [docs/NATIVE_MIGRATION_BOARD.md](docs/NATIVE_MIGRATION_BOARD.md): concrete migration order, workstreams, and exit gates
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): runtime and domain boundaries
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): day-to-day engineering workflow
- [docs/OPERATIONS.md](docs/OPERATIONS.md): local operations and operator support
- [docs/RELEASE.md](docs/RELEASE.md): versioning, tagging, installers, and release flow
- [docs/HARDWARE_PROFILE.md](docs/HARDWARE_PROFILE.md): supported studio hardware and scope
- [native/README.md](native/README.md): native workspace scaffold for the Qt shell, Rust engine, and IPC protocol

## Local Development

Prerequisites:

- Node.js 20
- npm

Start the browser app:

```bash
npm install
npm run seed
npm run dev
```

The browser app runs locally at [http://localhost:3000](http://localhost:3000).

Use the Electron path for startup, shutdown, tray, updater, or packaging work:

```bash
npm run electron:dev:open
```

Use the native path for architecture migration work:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:package:mac:local
npm run native:package:mac:smoke
npm run native:smoke
npm run native:smoke:bundled-engine
npm run native:smoke:lifecycle
npm run native:smoke:failures
npm run native:acceptance
```

On macOS, the native shell build auto-detects common Homebrew Qt prefixes. If your Qt install lives elsewhere, set `CMAKE_PREFIX_PATH` explicitly before `npm run native:build`.

Common commands:

```bash
npm run clean
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run electron:dist:win:local
npm run native:foundation
npm run test:coverage
npm run test:e2e
npm run ci
```

`npm run clean` removes generated local artifacts such as `.next`, coverage output, packaged Electron output, Playwright reports, and release build folders.

## Release Model

Releases are changelog-driven and tag-driven:

1. Land changes on `main`
2. Bump `package.json` / `package-lock.json`
3. Move release notes from `[Unreleased]` into a versioned `CHANGELOG.md` section
4. Run `npm run release:verify`
5. Commit release metadata
6. Push `main`
7. Create and push a `vX.Y.Z` tag

The release workflow validates metadata, creates GitHub release notes from `CHANGELOG.md`, builds both packaged apps, and uploads the installer/update artifacts to GitHub Releases.

For unsigned Windows verification before buying signing, build a local NSIS installer without publishing:

```bash
npm run electron:dist:win:local
```

## Engineering Standards

- local-first reliability beats feature breadth
- operator clarity beats decorative UI
- hardware-facing changes require explicit validation
- no silent live-state writes on screen open unless that behavior is intentional and documented
- repo docs should reflect the actual supported hardware and workflows

## License

[MIT](LICENSE)
