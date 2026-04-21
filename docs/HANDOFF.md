# Engineering Handoff

## Purpose

This is the top-level engineering handoff for the repository as of `2026-04-21`.

Read this first before resuming product, release, or cleanup work. Use it as the entry point into the more detailed documents linked below.

## Current Operating Truth

- The product is a native desktop application built on a `Qt/QML` shell and a separate `Rust` engine.
- The legacy Electron/Next.js runtime was retired in `v2.1.0`. There is no browser-served or Electron-served path left in the repository.
- Native packaging, installer, update-repository, and release automation lanes exist, produce signed/unsigned operator-ready artifacts, and are driven from tagged releases.
- Native operator parity is engineering-complete. Acceptance is layered: deterministic offscreen `2560x1440` captures, real-GPU onscreen spot captures, and the install-time first-launch smoke test shipped in the QtIFW installer.
- Both native verification lanes (macOS and Windows) are blocking on `main`.
- A one-way legacy-import path (`native/rust-engine/src/legacy_import.rs`) remains so that operators migrating from a pre-`v2.0.0` Electron installation can bring their old `db.json` forward on first native launch. This is the only legacy code that is intentionally retained.

## Start Here

Read these in order:

1. `README.md`
2. `docs/HANDOFF.md`
3. `docs/RELEASE.md`
4. `docs/HARDWARE_PROFILE.md`
5. `docs/ARCHITECTURE.md`

Use these for deeper context only after the above are clear:

- `docs/PRODUCTIZATION_PLAN.md`
- `native/README.md`
- `native/qt-shell/README.md`
- `docs/archive/DESKTOP_ARCHITECTURE_PLAN.md` (historical; frozen at `v2.1.0`)
- `docs/archive/NATIVE_PARITY_HANDOFF.md` (historical; frozen at `v2.1.0`)

## Locked Decisions

Do not reopen these casually:

- product name: `SSE ExEd Studio Control`
- primary deployment profile: one fixed studio workstation
- packaging: Qt Installer Framework offline installers
- update channel: maintenance-tool update repositories
- supported primary hardware assumptions in `docs/HARDWARE_PROFILE.md`
- engine-owned persistence, safety rules, and device logic
- the native runtime is the only product runtime; do not reintroduce an Electron or Next.js path

## Current Blockers

The highest-value unresolved work is:

1. Keep CI and native verification lanes diagnosable.
   Both macOS and Windows native lanes are blocking on `main`. If either goes red, diagnose via the per-run `native/build/Testing/Temporary/` and `qt-shell/qmltest-results.{tap,xml}` artifacts that the lanes upload on every run.
2. Keep the backlog actionable.
   Do not let real execution work live only in prose documents; open execution issues or milestone items before starting the next major slice.

## Execution Queue

The current GitHub execution queue is:

- release-artwork polish and public-distribution signing posture remain tracked in `docs/PRODUCTIZATION_PLAN.md` §3 rather than as separate execution items

## Validation Baseline

Before trusting any substantial change, run the smallest command set that matches the risk.

Common baseline:

```bash
npm install
npm run format:check
npm run release:check
```

Native baseline:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:shell:test
npm run native:smoke
npm run native:acceptance
```

Full release verification (before tagging):

```bash
npm run release:verify
```

## Repo Hygiene Rules

- Prefer one authoritative doc for current truth and link to detail docs instead of duplicating status prose everywhere.
- Do not check in workstation-specific absolute paths.
- Keep generated artifacts, transient captures, and local-only clutter out of version control.
- If CI is red, either fix it or document precisely why the lane is intentionally non-blocking.

## Historical Note

The repository previously carried a full Electron/Next.js runtime alongside the native shell as a parity oracle. That runtime, its tests, and its CI/CD lanes were removed in `v2.1.0`. See `docs/archive/NATIVE_PARITY_HANDOFF.md` for the frozen parity appendix that drove the recovery program, and the `v2.0.1 → v2.1.0` changelog entries for the removal scope.
