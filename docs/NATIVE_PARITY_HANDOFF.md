# Native Parity Handoff

## Purpose

This is the detailed parity appendix for the broader repository handoff in [docs/HANDOFF.md](./HANDOFF.md).

Read `docs/HANDOFF.md` first. Then use this document for the current parity evidence set, the remaining operator-visible deltas, and the specific native surfaces that still need comparison work.

## Current Truth

- The approved end-state architecture is unchanged: native `Qt/QML` shell plus a separate `Rust` engine.
- The legacy Electron app remains in the repository as the exact operator-parity oracle and rollback/comparison surface.
- Native parity is materially improved but not signed off.
- The repo has working native packaging and release lanes, but native operator parity is not yet cleared for final release acceptance.
- Do not treat deterministic captures alone as release proof. Final acceptance still requires fullscreen live comparison on the real `2560x1440` operator monitor.

## Handoff Summary

### What landed

1. Shared visual-substrate reset advanced materially.
   - Bundled `IBM Plex Sans` and `IBM Plex Mono` are loaded at shell startup from `native/qt-shell/assets/fonts/`.
   - Shared theme and control styling were reset toward the legacy UI in:
     - `native/qt-shell/qml/ConsoleTheme.qml`
     - `native/qt-shell/qml/ConsoleButton.qml`
     - `native/qt-shell/qml/Main.qml`
   - Deterministic capture atmosphere was brought closer to the real shell in:
     - `native/qt-shell/qml/ParityCaptureHarness.qml`

2. Setup slice parity moved forward materially.
   - The commissioning modal in `native/qt-shell/qml/SetupWizardOverlay.qml` was tightened toward the Electron `setup-required` oracle.
   - The centered setup workspace framing in `native/qt-shell/qml/SetupWorkspacePanel.qml` was corrected so the shell is no longer padded twice.
   - The control-surface replica in `native/qt-shell/qml/SetupControlSurfacePanel.qml` was restructured so the deck header, mapped-slots badge, tabs, selection treatment, and right detail rail are much closer to the legacy layout.
   - The left-rail setup cards were retuned in:
     - `native/qt-shell/qml/SetupQuickSetupPanel.qml`
     - `native/qt-shell/qml/SetupConnectionProbePanel.qml`
     - `native/qt-shell/qml/SetupGuidePanel.qml`
     - `native/qt-shell/qml/SetupInstallerHelpPanel.qml`

3. Parity verification got more honest.
   - Operator-visible request URLs for setup control-surface evidence were normalized back to legacy-visible `localhost:3000` values where appropriate.
   - The deterministic capture substrate now better reflects the real shell instead of a separate simplified background.
   - The live verifier was tightened so false acceptance on the wrong monitor is no longer possible.

### What did not land

- True native visual parity has not been reached yet.
- Final live signoff on the real fullscreen `2560x1440` operator monitor was not possible in this session because that hardware configuration was not attached to the current machine.
- The native app should not be called release-ready until that live operator signoff exists.

## Evidence To Keep

### Legacy oracle

Use `artifacts/parity/legacy/operator-2560x1440/` as the visual source of truth.

### Curated native evidence

Keep only the deterministic workstation captures under `artifacts/parity/native/workstation/`:

- `about-open.png`
- `planning-empty.png`
- `planning-populated.png`
- `project-detail-open.png`
- `setup-control-dial-selected.png`
- `setup-control-page-nav.png`
- `setup-control-selected.png`
- `setup-required.png`
- `shortcuts-open.png`
- `time-report-open.png`

These are the only checked-in native parity captures that should survive this cleanup checkpoint.

### Live captures

`artifacts/parity/live/` is intentionally treated as transient output and is ignored going forward.

## Current Blocking Differences

### `setup-required`

The setup wizard modal is close, but still not identical to the legacy Electron oracle.

Remaining visible differences:

- the modal frame is still slightly roomier than the legacy frame
- the backdrop blur / suppression treatment still does not match literally
- the welcome stack remains slightly more vertically spread than the oracle
- the lower divider / footer treatment remains a little more prominent than legacy

### `setup-control-selected`

The setup control-surface scene is structurally much closer, but still not identical.

Remaining visible differences:

- the setup-page atmosphere is still somewhat darker / flatter than the Electron oracle
- the deck content still reads slightly high / underscaled within the center frame
- the right detail rail still has smaller spacing and chrome mismatches
- several controls are close but not pixel-identical in density or emphasis

### Hardware acceptance blocker

The required live acceptance workflow is still blocked on access to the real fullscreen `2560x1440` operator monitor. Deterministic workstation captures are useful for iteration, but they are not the final acceptance gate.

## Key Findings

### Findings that changed engineering direction

- Shared substrate drift was a real blocker. Slice-by-slice tuning before fixing fonts, theme tokens, control density, and background atmosphere produced misleading parity progress.
- Several setup mismatches were structural rather than cosmetic. The correct fix was to reframe the setup layout around the legacy geometry, not to keep scaling individual child controls.
- Verification tooling had to become stricter. A parity workflow that accepts the wrong monitor, wrong state, or stale captures creates false confidence.
- Operator-visible request data matters for parity. The setup control-surface comparison was not valid until visible URLs and request surfaces matched the legacy oracle state.

### Findings for product management

- The native recovery program is real and materially progressed.
- Packaging and release automation exist, but should not be interpreted as final product signoff.
- The most important remaining work is narrow and visual, not architectural.
- The project should be treated as "close to parity, not yet parity-complete."

## Key Code Areas

Start here before editing:

- `native/qt-shell/qml/Main.qml`
- `native/qt-shell/qml/ConsoleTheme.qml`
- `native/qt-shell/qml/ConsoleButton.qml`
- `native/qt-shell/qml/ParityCaptureHarness.qml`
- `native/qt-shell/qml/SetupWizardOverlay.qml`
- `native/qt-shell/qml/SetupWorkspacePanel.qml`
- `native/qt-shell/qml/SetupControlSurfacePanel.qml`
- `native/qt-shell/qml/SetupQuickSetupPanel.qml`
- `native/qt-shell/qml/SetupConnectionProbePanel.qml`
- `native/qt-shell/qml/SetupGuidePanel.qml`
- `native/qt-shell/qml/SetupInstallerHelpPanel.qml`
- `native/qt-shell/src/main.cpp`

## Required Verification Workflow

When changing any operator-visible native surface:

1. Confirm the comparison is not being distorted by a known-bad shared substrate.
2. Run `npm run native:build`.
3. Launch the real native app fullscreen.
4. Use `--operator-verify-action` when a deterministic live state is required.
5. Interact with the live app when the workflow depends on real input.
6. Take a real screenshot.
7. Bring Codex back to the front.
8. Compare the result against the matching legacy screenshot before accepting the change.

Useful commands:

```bash
npm run native:build
npm run native:parity:capture -- --scene=setup-required --resolution=workstation
npm run native:parity:capture -- --scene=setup-control-selected --resolution=workstation
npm run native:parity:live -- --action=setup-required
npm run native:parity:live -- --action=setup-control-selected
```

Do not accept stale evidence, wrong-monitor captures, or state-mismatched comparisons.

## Recommended Next Session

1. Read this document first.
2. Compare:
   - `artifacts/parity/legacy/operator-2560x1440/setup-required.png`
   - `artifacts/parity/native/workstation/setup-required.png`
   - `artifacts/parity/legacy/operator-2560x1440/setup-control-selected.png`
   - `artifacts/parity/native/workstation/setup-control-selected.png`
3. Resume only the remaining concrete differences listed above.
4. Attach the real fullscreen `2560x1440` operator monitor before attempting final signoff.
5. Do not reopen broad substrate work unless a fresh comparison proves the remaining mismatch is still global instead of slice-local.

## Release Posture

- Native packaging and update lanes are in place.
- Native parity is still an active recovery program.
- Do not claim native release readiness or native closeout completion until the remaining visual deltas are removed and the live `2560x1440` operator verification loop is passed.

## Cleanup Performed In This Checkpoint

- removed stale parity-recovery, parity-audit, migration-board, parity-map, and closeout documents
- redirected repo references to this single handoff
- removed transient live-capture artifacts from version control scope
- kept only the curated deterministic parity evidence set
- removed local-only agent config, local backup dumps, generated build/dependency output, and other workstation-specific clutter so the repo handoff starts from source plus curated evidence only

## Files Removed By Design

Earlier intermediate parity documents were intentionally retired because they were redundant, stale, or both.

This was deliberate repository compaction, not accidental loss. Their relevant content now lives in this document and in `docs/HANDOFF.md`.
