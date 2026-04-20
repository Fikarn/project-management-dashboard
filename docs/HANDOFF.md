# Engineering Handoff

## Purpose

This is the top-level handoff for the repository as of `2026-04-20`.

Read this first before resuming product, parity, release, or cleanup work. Use it as the entry point to the more detailed documents linked below.

## Current Operating Truth

- The approved architecture is unchanged: native `Qt/QML` shell plus a separate `Rust` engine.
- The native desktop runtime is the intended product path.
- The legacy Electron runtime remains in the repository only as a parity oracle and rollback/comparison aid.
- Native packaging, installer, update-repository, and release automation lanes exist and are meaningful.
- Native operator parity is materially advanced but not signed off.
- Final release acceptance still depends on live fullscreen verification on the real `2560x1440` operator monitor, not only deterministic captures or CI output.

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

1. Finish native operator parity signoff.
   The remaining visual/operator-visible differences are tracked in `docs/NATIVE_PARITY_HANDOFF.md`.
2. Prove parity on the real fullscreen `2560x1440` operator monitor.
   Deterministic workstation captures are useful for iteration, but they do not replace live operator verification.
3. Keep CI and native verification lanes diagnosable.
   If a native shell lane fails, preserve the test logs and fix the failure or explicitly narrow the gate.
4. Keep the backlog actionable.
   Do not let real execution work live only in prose documents; open execution issues or milestone items before starting the next major slice.

## Execution Queue

The current GitHub execution queue for the remaining handoff work is:

- `#24` Finish native parity signoff on the real `2560x1440` operator monitor
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
2. Build the native app.
3. Load the real app fullscreen.
4. Use the checked-in live verify action when a deterministic state is required.
5. Compare against the matching legacy reference before accepting the change.

Use `docs/NATIVE_PARITY_HANDOFF.md` for the detailed parity evidence set, concrete remaining deltas, and the currently curated screenshot paths.

## Repo Hygiene Rules

- Prefer one authoritative doc for current truth and link to detail docs instead of duplicating status prose everywhere.
- Do not check in workstation-specific absolute paths.
- Do not let release posture, parity posture, and architecture posture disagree across docs.
- Keep generated artifacts, transient captures, and local-only clutter out of version control.
- If CI is red, either fix it or document precisely why the lane is intentionally non-blocking.

## Recommended Next 30 Days

1. Close the remaining parity deltas called out in `docs/NATIVE_PARITY_HANDOFF.md`.
2. Run live fullscreen signoff on the real operator monitor.
3. Confirm the native shell verification lanes are green and diagnosable on both macOS and Windows.
4. Open or refresh explicit tracker items for the remaining release-artwork and public-distribution trust work instead of leaving them only in docs.
5. After parity signoff, remove any remaining "parity recovery in progress" language from repo-facing docs.

## Historical Note

The repository previously carried a larger cluster of parity and closeout documents. Those were intentionally compacted. Use this file for the top-level handoff and `docs/NATIVE_PARITY_HANDOFF.md` for the detailed parity appendix.
