# Native Parity Implementation Handoff

## Purpose

This document is the clean starting point for the next Codex chat.

It consolidates the current parity plan, the `2026-04-20` audit, and the immediate implementation order so a new chat can continue without reconstructing context from prior conversations.

This is an implementation handoff, not a historical summary.

## Non-Negotiable Product Rules

1. The legacy Electron app is the exact operator-visible oracle.
2. The native target remains `Rust + Qt/QML`.
3. The native app is not release-ready until full legacy parity is signed off.
4. The primary target environment is fullscreen `2560x1440` on the permanent second monitor.
5. Legacy parity means operator-facing equivalence in:
   - typography
   - color and surface treatment
   - density and spacing
   - workflow order
   - keyboard behavior
   - restored state
   - modal sequencing
6. Do not treat backend/runtime progress as proof of UI parity.
7. Do not treat a slice as complete if it still sits on the wrong shared visual substrate.

## Start Here

Read these documents first:

1. `docs/UI_PARITY_RECOVERY.md`
2. `docs/UI_PARITY_AUDIT_2026-04-20.md`
3. `docs/NATIVE_MIGRATION_BOARD.md`
4. `docs/NATIVE_PARITY_MAP.md`
5. `docs/DEVELOPMENT.md`

These docs were updated to reflect the current blocker and should be treated as repo truth.

## Current Verified State

The native app has meaningful architecture progress:

- Rust engine ownership is real
- Qt/QML shell ownership is real
- live verification tooling exists
- parity fixtures exist
- planning, lighting, audio, setup, support, control-surface, and dialog surfaces exist natively

However, full-program parity is still blocked by shared visual-substrate mismatches.

The problem is now known to be systemic, not merely slice-local.

## Blocking Reality

The current blocking phase is:

- `P2: shared visual-substrate reset`

Do not continue broad slice polish until `P2` is materially complete enough for screenshot comparisons to mean something.

## Audit-Backed Findings

### 1. Typography is globally wrong

Legacy authority:

- `app/globals.css`
  - `--font-ui: "IBM Plex Sans", ...`
  - `--font-mono: "IBM Plex Mono", ...`

Current native authority:

- `native/qt-shell/qml/ConsoleTheme.qml`
  - `uiFontFamily: "Avenir Next"`
  - `monoFontFamily: "Menlo"`

Verified implementation gap:

- there are no bundled IBM Plex font assets in the repository
- `native/qt-shell/src/main.cpp` does not currently load bundled legacy fonts with `QFontDatabase::addApplicationFont`

Implication:

- the native shell cannot currently render the primary legacy typography system faithfully

### 2. Shared colors and surfaces are globally wrong

Legacy authority:

- `app/globals.css`
  - layered radial gradients
  - subtle `56px` grid
  - darker console surfaces
  - stronger blur/shadow language
  - richer surface composition for `console-surface-strong`

Current native authority:

- `native/qt-shell/qml/ConsoleTheme.qml`
  - flatter fills such as `surfaceDefault: "#15151d"`
  - simpler token system
  - misleading token naming in places, for example `accentBlue` currently maps to `#99BA92`

Implication:

- every slice is being rendered on the wrong shared palette and surface language

### 3. Overflow and cramped copy are systemic

Verified hotspots:

- `native/qt-shell/qml/SetupControlSurfacePanel.qml`
- `native/qt-shell/qml/SetupWorkspacePanel.qml`
- `native/qt-shell/qml/AudioSelectedStripPanel.qml`
- `native/qt-shell/qml/PlanningProjectDetailDialog.qml`
- `native/qt-shell/qml/SetupWizardOverlay.qml`
- `native/qt-shell/qml/AudioToolbarPanel.qml`

Verified patterns:

- many `font.pixelSize: 8`, `9`, `10`, `11`, `12`
- many rigid `implicitHeight` values
- many `width: Math.min(...)` and `height: Math.min(...)` constraints
- repeated `wrapMode` and `elide` fallbacks used to survive undersized containers

Implication:

- text overflow and cramped density are currently built into the sizing strategy

### 4. Part of the evidence set is stale

The current native `support-open` live evidence must not be treated as signoff material until it is regenerated.

Grounding:

- `scripts/legacy-parity-capture.mjs` explicitly opens manual setup fallback content and the Gatekeeper / SmartScreen help section for the legacy oracle
- the current native live `support-open` capture does not align closely enough with that state to be trusted as final parity proof

## Primary Evidence Set

The next chat should use these as the main visual references:

### Planning

- legacy `artifacts/parity/legacy/operator-2560x1440/planning-populated.png`
- native `artifacts/parity/native/workstation/planning-populated.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/project-detail-open.png`
- native `artifacts/parity/native/workstation/project-detail-open.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/time-report-open.png`
- native `artifacts/parity/native/workstation/time-report-open.png`

### Lighting

- legacy `artifacts/parity/legacy/operator-2560x1440/lighting-populated.png`
- native `artifacts/parity/live/manual-lighting-rerun.png`

### Audio

- legacy `artifacts/parity/legacy/operator-2560x1440/audio-populated.png`
- native `artifacts/parity/live/2026-04-20T08-55-08-990Z-audio-populated.png`

### Setup / Support / Control Surface

- legacy `artifacts/parity/legacy/operator-2560x1440/setup-required.png`
- native `artifacts/parity/live/2026-04-19T16-10-09-767Z-setup-required.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/setup-ready.png`
- native `artifacts/parity/live/2026-04-19T17-45-05-753Z-setup-ready.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/support-open.png`
- native `artifacts/parity/live/2026-04-19T17-46-36-627Z-support-open.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/setup-control-selected.png`
- native `artifacts/parity/live/setup-control-selected-latest.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/setup-control-page-nav.png`
- native `artifacts/parity/live/setup-control-page-nav-latest.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/setup-control-dial-selected.png`
- native `artifacts/parity/live/setup-control-dial-selected-latest.png`

### Remaining dialogs

- legacy `artifacts/parity/legacy/operator-2560x1440/shortcuts-open.png`
- native `artifacts/parity/live/2026-04-20T07-26-13-321Z-open-shortcuts.png`
- legacy `artifacts/parity/legacy/operator-2560x1440/about-open.png`
- native `artifacts/parity/live/2026-04-20T07-26-47-109Z-open-about.png`

## Program Order

The implementation order from here is:

1. `P2` shared visual-substrate reset
2. setup/support/control-surface visual re-baseline
3. lighting visual re-baseline
4. dashboard/planning shell visual re-baseline
5. audio visual re-baseline
6. remaining dialogs and full-program signoff

This order is deliberate:

- setup/control-surface currently exposes the typography and overflow problems most clearly
- lighting is the next clearest visual miss
- planning and audio are closer structurally, but still depend on the corrected substrate

## P2 Shared Visual-Substrate Reset

This is the next implementation phase. It is the blocker.

### P2.1 Font strategy

Goal:

- reproduce the legacy font stack closely enough for fullscreen screenshot comparison

Required tasks:

1. decide how to make the legacy font stack available to QML
2. wire font loading into native startup
3. make the shared theme use the loaded families, not `Avenir Next` / `Menlo`
4. remove direct `font.family: "Menlo"` leftovers where they bypass the shared mono family

Likely file targets:

- `native/qt-shell/src/main.cpp`
- `native/qt-shell/qml/ConsoleTheme.qml`
- `native/qt-shell/CMakeLists.txt`
- any new native font asset directory if fonts are bundled
- targeted QML files with hard-coded `"Menlo"`

Acceptance bar:

- the shared UI font and mono font used by QML are aligned with the legacy stack
- the app renders with the corrected font families in the live app, not only in theory

### P2.2 Shared theme token reset

Goal:

- align QML tokens with the actual legacy CSS visual system

Required tasks:

1. translate the actual legacy CSS substrate from `app/globals.css` into native theme tokens
2. align:
   - backgrounds
   - surface fills
   - border colors
   - strong-surface treatment
   - overlay scrims
   - shadows
   - primary accent usage
3. rename misleading tokens if their current names no longer match their role
4. update shared controls to consume the corrected tokens

Primary file targets:

- `app/globals.css`
- `native/qt-shell/qml/ConsoleTheme.qml`
- `native/qt-shell/qml/ConsoleSurface.qml`
- `native/qt-shell/qml/ConsoleButton.qml`
- `native/qt-shell/qml/ConsoleTextField.qml`
- `native/qt-shell/qml/ConsoleTextArea.qml`
- `native/qt-shell/qml/ConsoleComboBox.qml`
- `native/qt-shell/qml/ConsoleBadge.qml`
- `native/qt-shell/qml/ConsoleStatusBadge.qml`
- `native/qt-shell/qml/ConsoleStatCard.qml`
- `native/qt-shell/qml/ConsoleTabButton.qml`
- `native/qt-shell/qml/ConsoleModal.qml`
- `native/qt-shell/qml/ConsoleSlider.qml`
- `native/qt-shell/qml/ConsoleSwitch.qml`

Acceptance bar:

- the shared controls read like the legacy renderer before touching any slice-local styling

### P2.3 Shared density and overflow reset

Goal:

- remove the largest global typography and clipping problems before slice polish

Required tasks:

1. audit and reduce the worst tiny text
2. remove or soften the worst fixed-height and width-capping constraints
3. preserve fullscreen `2560x1440` operator density without forcing microcopy to `8-10px`
4. stop using `wrapMode` or `elide` as a substitute for correct sizing where the container itself is wrong

First-pass hotspot files:

- `native/qt-shell/qml/SetupControlSurfacePanel.qml`
- `native/qt-shell/qml/SetupWorkspacePanel.qml`
- `native/qt-shell/qml/AudioSelectedStripPanel.qml`
- `native/qt-shell/qml/PlanningProjectDetailDialog.qml`
- `native/qt-shell/qml/SetupWizardOverlay.qml`
- `native/qt-shell/qml/AudioToolbarPanel.qml`

Acceptance bar:

- the worst overflow and cramped-copy cases are removed in the live app
- slice comparisons are no longer dominated by global text and sizing failures

### P2.4 Evidence hygiene cleanup

Goal:

- repair the evidence set before using it for downstream signoff

Required tasks:

1. regenerate stale `support-open` native live evidence
2. confirm the live screenshot really matches the legacy oracle state
3. keep legacy/native comparisons paired to the same exact workflow state

Primary file targets:

- `scripts/native-live-parity.mjs`
- `scripts/legacy-parity-capture.mjs`
- `native/qt-shell/qml/Main.qml`
- any setup/support QML needed to reproduce the correct state

Acceptance bar:

- no stale or mismatched evidence is being used as parity proof

## After P2: Slice Order

Only once `P2` is materially complete should the next chat continue the slice passes.

### Phase 1: Setup / support / control-surface

Why first:

- it is currently the worst combination of wrong typography, wrong chrome, cramped copy, and overflow

Primary files:

- `native/qt-shell/qml/SetupWorkspacePanel.qml`
- `native/qt-shell/qml/SetupQuickSetupPanel.qml`
- `native/qt-shell/qml/SetupWizardOverlay.qml`
- `native/qt-shell/qml/SetupControlSurfacePanel.qml`
- `native/qt-shell/qml/SetupGuidePanel.qml`
- `native/qt-shell/qml/SetupInstallerHelpPanel.qml`
- `native/qt-shell/qml/SetupConnectionProbePanel.qml`

### Phase 2: Lighting

Primary files:

- `native/qt-shell/qml/LightingWorkspacePanel.qml`
- `native/qt-shell/qml/LightingToolbarPanel.qml`
- `native/qt-shell/qml/LightingContentPanel.qml`
- `native/qt-shell/qml/LightingSidebarPanel.qml`
- `native/qt-shell/qml/LightingFixtureDialog.qml`
- `native/qt-shell/qml/LightingDeleteFixtureDialog.qml`

### Phase 3: Dashboard / planning shell

Primary files:

- `native/qt-shell/qml/DashboardHeaderPanel.qml`
- `native/qt-shell/qml/PlanningWorkspacePanel.qml`
- `native/qt-shell/qml/PlanningToolbarPanel.qml`
- `native/qt-shell/qml/PlanningBoardPanel.qml`
- `native/qt-shell/qml/PlanningSummaryGrid.qml`
- `native/qt-shell/qml/PlanningProjectDetailDialog.qml`
- `native/qt-shell/qml/PlanningTimeReportDialog.qml`

### Phase 4: Audio

Primary files:

- `native/qt-shell/qml/AudioWorkspacePanel.qml`
- `native/qt-shell/qml/AudioToolbarPanel.qml`
- `native/qt-shell/qml/AudioChannelCard.qml`
- `native/qt-shell/qml/AudioSelectedStripPanel.qml`
- `native/qt-shell/qml/AudioMixTargetsPanel.qml`

### Phase 5: Remaining dialogs and final signoff

Primary files:

- `native/qt-shell/qml/OperatorShortcutsDialog.qml`
- `native/qt-shell/qml/DashboardAboutDialog.qml`
- any remaining operator-facing dialog not yet rechecked on the corrected substrate

## Required Workflow For Every Operator-Facing Change

Use this exact workflow:

1. build the native shell
2. launch the real app fullscreen
3. use `--operator-verify-action` when a deterministic state is needed
4. interact with the live app directly when the flow depends on interaction
5. take a real screenshot
6. bring Codex back to the front
7. compare against the matching legacy oracle before accepting the change

Useful commands:

```bash
npm run native:build
npm run parity:benchmark
npm run native:parity:capture
npm run native:parity:live -- --action=planning-populated
npm run native:parity:live -- --action=lighting-populated
npm run native:parity:live -- --action=audio-populated
npm run native:parity:live -- --action=setup-required
npm run native:parity:live -- --action=setup-ready
npm run native:parity:live -- --action=support-open
npm run native:parity:live -- --action=setup-control-selected
npm run native:parity:live -- --action=open-shortcuts
npm run native:parity:live -- --action=open-about
```

Do not use raw window width alone as the authority for layout decisions.

Do not accept stale live evidence.

## First Concrete Implementation Batch

If a new chat is starting implementation immediately, the first batch should be:

1. inspect `app/globals.css`, `native/qt-shell/qml/ConsoleTheme.qml`, and `native/qt-shell/src/main.cpp`
2. implement the native font-loading strategy
3. reset the shared theme tokens to match legacy substrate values and treatments
4. update the shared controls to consume the corrected theme
5. run a live screenshot pass on:
   - `setup-required`
   - `setup-control-selected`
   - `lighting-populated`
   - `planning-populated`
6. only after that start removing the largest fixed-size overflow bottlenecks

## Things The Next Chat Must Not Assume

- Do not assume the current live `support-open` capture is valid signoff evidence.
- Do not assume `Avenir Next` is an acceptable substitute for the legacy stack.
- Do not assume slice structure being present means the slice is visually close enough.
- Do not assume small text and wrap fallbacks are intentional parity choices.
- Do not assume control-surface is the only remaining gap. It is just the most obvious one.

## Success Definition

This recovery is on track only if each step reduces one of these real blockers:

- wrong typography
- wrong shared palette and surface treatment
- visible overflow and cramped copy
- stale or mismatched evidence
- slice screenshots being dominated by global theme drift instead of local parity details

If a proposed change does not reduce one of those, it is probably not the next thing to build.
