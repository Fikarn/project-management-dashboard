# UI Parity Audit 2026-04-20

## Purpose

This audit updates the parity program after a full-program screenshot and code review on `2026-04-20`.

The key conclusion is that the current native gap is primarily systemic, not local:

- the shared native visual substrate does not match the legacy renderer
- several slices have working native structure, but they are still rendered on the wrong font, palette, density, and sizing system
- some existing live evidence should not be treated as valid signoff material until it is regenerated

This document is evidence for the revised parity plan. It is not a speculative design note.

## Evidence Reviewed

### Legacy screenshot oracles reviewed

- `artifacts/parity/legacy/operator-2560x1440/planning-populated.png`
- `artifacts/parity/legacy/operator-2560x1440/project-detail-open.png`
- `artifacts/parity/legacy/operator-2560x1440/time-report-open.png`
- `artifacts/parity/legacy/operator-2560x1440/lighting-populated.png`
- `artifacts/parity/legacy/operator-2560x1440/audio-populated.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-required.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-ready.png`
- `artifacts/parity/legacy/operator-2560x1440/support-open.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-control-selected.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-control-page-nav.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-control-dial-selected.png`
- `artifacts/parity/legacy/operator-2560x1440/shortcuts-open.png`
- `artifacts/parity/legacy/operator-2560x1440/about-open.png`

### Native screenshot evidence reviewed

- `artifacts/parity/native/workstation/planning-populated.png`
- `artifacts/parity/native/workstation/project-detail-open.png`
- `artifacts/parity/native/workstation/time-report-open.png`
- `artifacts/parity/live/manual-lighting-rerun.png`
- `artifacts/parity/live/2026-04-20T08-55-08-990Z-audio-populated.png`
- `artifacts/parity/live/2026-04-19T16-10-09-767Z-setup-required.png`
- `artifacts/parity/live/2026-04-19T17-45-05-753Z-setup-ready.png`
- `artifacts/parity/live/2026-04-19T17-46-36-627Z-support-open.png`
- `artifacts/parity/live/setup-control-selected-latest.png`
- `artifacts/parity/live/setup-control-page-nav-latest.png`
- `artifacts/parity/live/setup-control-dial-selected-latest.png`
- `artifacts/parity/live/2026-04-20T07-26-13-321Z-open-shortcuts.png`
- `artifacts/parity/live/2026-04-20T07-26-47-109Z-open-about.png`

### Code reviewed

- `app/globals.css`
- `native/qt-shell/qml/ConsoleTheme.qml`
- `native/qt-shell/src/main.cpp`
- `native/qt-shell/qml/Main.qml`
- `native/qt-shell/qml/SetupControlSurfacePanel.qml`
- `native/qt-shell/qml/SetupWorkspacePanel.qml`
- `native/qt-shell/qml/AudioSelectedStripPanel.qml`
- `native/qt-shell/qml/PlanningProjectDetailDialog.qml`
- `scripts/legacy-parity-capture.mjs`
- `scripts/native-live-parity.mjs`

## Verified Findings

### 1. Typography mismatch is global and code-backed

Legacy typography authority:

- `app/globals.css` sets `--font-ui: "IBM Plex Sans", ...`
- `app/globals.css` sets `--font-mono: "IBM Plex Mono", ...`

Native typography authority:

- `native/qt-shell/qml/ConsoleTheme.qml` sets `uiFontFamily: "Avenir Next"`
- `native/qt-shell/qml/ConsoleTheme.qml` sets `monoFontFamily: "Menlo"`

Implementation gap:

- there are no bundled IBM Plex font assets in the repository
- there is no `QFontDatabase::addApplicationFont` path in `native/qt-shell/src/main.cpp`

Conclusion:

- the native shell cannot currently render the primary legacy font stack as designed
- this is a blocking shared-substrate issue, not a slice-local polish issue

### 2. Color, surface, and background treatment mismatch is global and code-backed

Legacy visual substrate:

- `app/globals.css` uses layered radial gradients, a subtle `56px` grid, blur, and darker console surfaces
- `console-surface-strong` in legacy CSS includes richer background treatment than a flat fill

Native visual substrate:

- `native/qt-shell/qml/ConsoleTheme.qml` defines a flatter palette with direct fills such as `surfaceDefault: "#15151d"` and `surfaceRaised: "#1a1a24"`
- token naming is also misleading in places, for example `accentBlue` currently maps to `#99BA92`, which is a green accent from the legacy palette rather than a blue accent

Conclusion:

- the native shared theme is not yet a faithful translation of the legacy renderer
- this mismatch is visible across planning, lighting, audio, setup, and dialogs

### 3. Density and overflow problems are systemic and code-backed

The QML tree still contains extensive use of tiny fixed text, rigid heights, and width-capping patterns. Current hotspots include:

- `native/qt-shell/qml/SetupControlSurfacePanel.qml`
- `native/qt-shell/qml/SetupWorkspacePanel.qml`
- `native/qt-shell/qml/AudioSelectedStripPanel.qml`
- `native/qt-shell/qml/PlanningProjectDetailDialog.qml`
- `native/qt-shell/qml/SetupWizardOverlay.qml`
- `native/qt-shell/qml/AudioToolbarPanel.qml`

Verified patterns present in the codebase today:

- `font.pixelSize: 8`, `9`, `10`, `11`, and `12` across many operator-facing surfaces
- rigid `implicitHeight` values in dense shells and detail rails
- `width: Math.min(...)` and `height: Math.min(...)` constraints inside modals and detail panes
- repeated `wrapMode`/`elide` fallbacks used to keep copy alive inside undersized containers

Conclusion:

- current text overflow and cramped layout issues are not isolated regressions
- they are a product of the present shared sizing strategy and must be addressed before final slice signoff

### 4. Evidence hygiene is incomplete

The current `support-open` native live evidence should not be treated as reliable signoff material until it is regenerated.

Grounding:

- the legacy capture flow for `support-open` in `scripts/legacy-parity-capture.mjs` explicitly opens manual setup fallback content and the Gatekeeper / SmartScreen help section
- the current native live screenshot `artifacts/parity/live/2026-04-19T17-46-36-627Z-support-open.png` does not match that expected surface closely enough to be trusted as final evidence

Conclusion:

- the parity program needs an explicit evidence-hygiene step, not only more visual tweaking

## Surface Severity

### Highest remaining gap

1. setup, support, and control-surface
2. lighting

### Medium remaining gap

3. dashboard/planning shell
4. audio

### Lower remaining gap, but still on the wrong substrate

5. project detail and time report
6. shortcuts and about

## Revised Implementation Implications

The next blocking phase must be a shared visual-substrate reset, not more isolated slice polish.

That phase must include:

1. native font strategy:
   - decide whether to bundle IBM Plex fonts or adopt another evidence-backed native loading strategy that reproduces the legacy stack
   - wire that through native startup and shared QML theme
2. token reset:
   - align shared QML colors, surfaces, borders, shadows, and modal backgrounds with the actual legacy CSS values and treatments
3. sizing reset:
   - remove the worst fixed tiny-text and rigid-height constraints from shared shells and the largest overflow hotspots
4. evidence cleanup:
   - regenerate stale live evidence before using it as slice signoff proof

Only after that phase should the slice order continue:

1. setup/support/control-surface visual re-baseline
2. lighting visual re-baseline
3. dashboard/planning shell visual re-baseline
4. audio visual re-baseline
5. remaining dialogs and full-program signoff

## Ready-For-Implementation Assessment

This revised plan is ready for implementation because:

- the blocking issues are now grounded in current screenshots and current code
- the next phase has a concrete scope
- the invalid evidence risk is identified explicitly
- the repo docs can now stop overstating slice completion and instead track the real blocker
