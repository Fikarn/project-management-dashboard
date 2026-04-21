# Engineering Handoff

## Purpose

This is the top-level handoff for the repository as of `2026-04-20`.

Read this first before resuming product, parity, release, or cleanup work. Use it as the entry point to the more detailed documents linked below.

## Current Operating Truth

- The approved architecture is unchanged: native `Qt/QML` shell plus a separate `Rust` engine.
- The native desktop runtime is the intended product path.
- The legacy Electron runtime remains in the repository only as a parity oracle and rollback/comparison aid.
- Native packaging, installer, update-repository, and release automation lanes exist and are meaningful.
- The Windows native verification lane remains diagnostic coverage only until `#25` is closed.
- Native operator parity is signed off on the engineering side.
- The release acceptance model now has three layers: deterministic offscreen captures at `2560x1440` (engineering gate), real-GPU onscreen spot captures (renderer sanity), and an install-time first-launch smoke test shipped in the Qt Installer Framework package (hardware gate). The physical `2560x1440` operator monitor is no longer a release blocker because the install-time smoke test catches hardware-specific regressions on the target machine during deployment.

## Start Here

Read these in order:

1. `README.md`
2. `docs/HANDOFF.md`
3. `docs/NATIVE_PARITY_HANDOFF.md`
4. `docs/RELEASE.md`
5. `docs/HARDWARE_PROFILE.md`
6. `docs/ARCHITECTURE.md`

Use these for deeper context only after the above are clear:

- `docs/DESKTOP_ARCHITECTURE_PLAN.md`
- `docs/PRODUCTIZATION_PLAN.md`
- `docs/LEGACY_RUNTIME.md`
- `native/README.md`
- `native/qt-shell/README.md`

## Locked Decisions

Do not reopen these casually:

- product name: `SSE ExEd Studio Control`
- primary deployment profile: one fixed studio workstation
- packaging: Qt Installer Framework offline installers
- update channel: maintenance-tool update repositories
- supported primary hardware assumptions in `docs/HARDWARE_PROFILE.md`
- engine-owned persistence, safety rules, and device logic

## Current Blockers

The highest-value unresolved work is:

1. Keep CI and native verification lanes diagnosable.
   The Windows lane is intentionally non-blocking until `#25` stabilizes it; the software-scenegraph backend change in `scripts/native-shell-test.mjs` is the current hypothesis. Promote it back to blocking only after three consecutive green runs.
2. Keep the backlog actionable.
   Do not let real execution work live only in prose documents; open execution issues or milestone items before starting the next major slice.

## Execution Queue

The current GitHub execution queue for the remaining handoff work is:

- `#24` Engineering parity signoff is done via deterministic offscreen + onscreen captures; residual hardware verification is delegated to the install-time smoke test shipped in the QtIFW installer
- `#25` Stabilize and document the Windows native shell verification lane
- `#26` Add release artwork and screenshots for the repo and release pages

## Validation Baseline

Before trusting any substantial change, run the smallest command set that matches the risk.

Common baseline:

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test:coverage
```

Native/parity baseline:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:shell:test
npm run native:smoke
npm run native:acceptance
```

Release baseline:

```bash
npm run release:check
npm run release:verify
```

## Required Parity Workflow

When editing any operator-visible native surface:

1. Confirm the comparison is not distorted by a shared-substrate mismatch first.
2. Run `npm run native:parity:capture -- --resolution=workstation` for deterministic offscreen evidence.
3. Run `npm run native:parity:capture -- --scene=<scene> --resolution=workstation --onscreen` for a spot-check real-GPU capture when the surface uses shaders, blur, or gradients.
4. Diff against the matching legacy oracle in `artifacts/parity/legacy/operator-2560x1440/` before accepting the change.

Use `docs/NATIVE_PARITY_HANDOFF.md` for the detailed parity evidence set, concrete remaining deltas, and the currently curated screenshot paths.

## Repo Hygiene Rules

- Prefer one authoritative doc for current truth and link to detail docs instead of duplicating status prose everywhere.
- Do not check in workstation-specific absolute paths.
- Do not let release posture, parity posture, and architecture posture disagree across docs.
- Keep generated artifacts, transient captures, and local-only clutter out of version control.
- If CI is red, either fix it or document precisely why the lane is intentionally non-blocking.

## Recommended Next 30 Days

1. Cut `v2.0.1` and the follow-up `v2.1.0` that retires the legacy runtime.
2. Stabilize `#25`, then restore the Windows native verification lane to blocking status.
3. Open or refresh explicit tracker items for the remaining release-artwork and public-distribution trust work instead of leaving them only in docs.

## Historical Note

The repository previously carried a larger cluster of parity and closeout documents. Those were intentionally compacted. Use this file for the top-level handoff and `docs/NATIVE_PARITY_HANDOFF.md` for the detailed parity appendix.
