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

## Recovery Status

The approved end-state architecture is:

- native `Qt/QML` operator shell
- separate `Rust` engine
- no browser-served runtime in production

Current repo status:

- backend migration to the native `Qt/QML` shell plus `Rust` engine is in place
- native operator parity recovery is active and materially advanced, but not signed off
- native packaging and release lanes exist, but final operator release readiness still depends on parity signoff
- the legacy Electron app remains in the repo as a workflow benchmark and rollback/comparison reference, not a release path

The current recovery truth and handoff status are tracked in [docs/NATIVE_PARITY_HANDOFF.md](docs/NATIVE_PARITY_HANDOFF.md).

## Distribution Targets

- Windows 11 `x64` packaged as a Qt Installer Framework offline installer
- macOS Apple Silicon packaged as a Qt Installer Framework offline installer
- GitHub Releases as the installer and update-repository artifact backend
- One fixed studio workstation as the primary production target

## Download

Release artifacts are published through [GitHub Releases](https://github.com/Fikarn/project-management-dashboard/releases/latest).

- Windows: install the generated native `.exe` offline installer
- macOS: install from the generated native offline installer archive
- Updates: use the published native maintenance-tool update repository artifacts for controlled workstation updates
- Integrity: verify downloads against the published per-platform `SHA256` manifest before operator rollout
- Trust: expect unsigned-installer warnings on macOS and Windows and handle them as a deliberate operator-managed install, not a public self-serve consumer install

Productization work, release gates, and legacy-runtime archival guidance are tracked in [docs/PRODUCTIZATION_PLAN.md](docs/PRODUCTIZATION_PLAN.md), [docs/RELEASE.md](docs/RELEASE.md), and [docs/LEGACY_RUNTIME.md](docs/LEGACY_RUNTIME.md).

## Operator Lifecycle

- First launch starts the native Qt shell, launches the bundled Rust engine, and waits for engine readiness before routing into commissioning or the dashboard
- First-run commissioning is available from inside the app for planning, lighting, and Companion setup
- Closing the main window shows a warning and then fully quits the app if confirmed
- Restored workspace and shell state come from the engine snapshot, not shell-local browser state
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
- [docs/LEGACY_RUNTIME.md](docs/LEGACY_RUNTIME.md): archival browser/Electron runtime guidance and rollback-only commands
- [docs/DESKTOP_ARCHITECTURE_PLAN.md](docs/DESKTOP_ARCHITECTURE_PLAN.md): approved end-state Qt/QML + Rust architecture plan
- [docs/NATIVE_PARITY_HANDOFF.md](docs/NATIVE_PARITY_HANDOFF.md): current parity truth, evidence set, fixes landed, and remaining blockers
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
- Rust stable toolchain
- Qt 6 desktop SDK for local native builds
- Qt Installer Framework for local installer/update generation

The native runtime is the intended end-state product path. The legacy Electron runtime stays in the repo as the parity oracle and rollback/comparison reference until native parity is signed off.

For the native runtime:

```bash
npm install
npm run native:check
npm run native:test
npm run native:build
npm run native:shell:test
npm run native:package:mac:local
npm run native:package:mac:smoke
npm run native:package:mac:clean-smoke
npm run native:package:win:local
npm run native:package:win:smoke
npm run native:package:win:clean-smoke
npm run native:installer:mac:prepare
npm run native:installer:mac:local
npm run native:installer:win:prepare
npm run native:installer:win:local
npm run native:update-repo:mac:prepare
npm run native:update-repo:mac:local
npm run native:update-repo:win:prepare
npm run native:update-repo:win:local
npm run native:release:mac:local
npm run native:release:win:local
npm run native:smoke
npm run native:smoke:clean-start
npm run native:smoke:bundled-engine
npm run native:smoke:restart:clean-start
npm run native:smoke:lifecycle
npm run native:smoke:failures
npm run native:acceptance
```

The browser/Next and Electron paths remain in the repo as historical benchmark and comparison paths:

```bash
npm run legacy:seed
npm run legacy:browser:dev
npm run legacy:electron:dev:open
```

See [docs/LEGACY_RUNTIME.md](docs/LEGACY_RUNTIME.md) for the full legacy-runtime guidance. Do not use those paths for current product work unless you are explicitly comparing against or rolling back to the old stack.

On macOS, the native shell build auto-detects common Homebrew Qt prefixes. On Windows CI or local Qt installs, `CMAKE_PREFIX_PATH`, `QT_ROOT_DIR`, `QTDIR`, `QT_DIR`, or `Qt6_DIR` may be used to resolve the Qt CMake package location.

Common commands:

```bash
npm run clean
npm run lint
npm run format:check
npm run typecheck
npm run build
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

The release workflow validates metadata, creates GitHub release notes from `CHANGELOG.md`, builds native Windows and macOS installers, generates native update-repository archives, and uploads the release artifacts to GitHub Releases.

## Engineering Standards

- local-first reliability beats feature breadth
- operator clarity beats decorative UI
- hardware-facing changes require explicit validation
- no silent live-state writes on screen open unless that behavior is intentional and documented
- repo docs should reflect the actual supported hardware and workflows
- parity work is not done until native behavior is checked against the legacy benchmark and covered by native automation where practical

## License

[MIT](LICENSE)
