# UI Parity Recovery

## Why This Exists

The current native migration preserved backend ownership and release plumbing, but it did not preserve the legacy operator front-end closely enough.

The legacy Electron surface remains the actual parity oracle:

- the operator design system lives in `app/globals.css`
- the dashboard shell and workspace framing live in `app/components/dashboard/*`
- the planning, lighting, audio, and setup screens live in `app/components/*` and `app/setup/*`

The current native shell is a new QML implementation:

- the shell is composed from `native/qt-shell/qml/Main.qml` and the surrounding `qml/*` panels
- the shell uses Qt Quick Controls directly via `native/qt-shell/src/main.cpp`
- there is no shared token bridge, font stack, or component layer tying the QML shell to the legacy renderer

That means the repo currently has backend/runtime migration, but not reliable UI equivalence.

## Practical Consequence

Do not treat claims of "parity complete" as proof of UI parity until the native shell is revalidated against the legacy renderer.

When doing operator-surface work, use:

```bash
npm run parity:benchmark
```

That command opens:

- the legacy Electron operator surface
- the packaged native macOS app when available

Use the legacy surface as the acceptance oracle for layout, density, typography, spacing, controls, and workflow sequencing.

## Recovery Posture

The repo is now explicitly on the `QML + Rust` path, but only under a stricter parity burden:

1. The legacy Electron app remains the exact acceptance oracle for every operator-visible surface.
2. The native app is not release-ready until parity is signed off with screenshots and live verification evidence.
3. QML work must follow the shared native design system and fullscreen operator rules instead of drifting into native reinterpretation.
4. Live verification must use engine-owned parity fixtures and the real app window, not only deterministic QML harnesses.
5. Shared visual-substrate mismatches block slice signoff. If fonts, palette, density, or overflow behavior are still globally wrong, slice-level polish does not count as parity work.

## Verified Systemic Gaps

The current parity gap is no longer best described as "remaining dialogs" or "last-mile polish". The blocking issues are shared across the whole program and are grounded in current code:

- typography mismatch:
  - legacy renderer uses `IBM Plex Sans` and `IBM Plex Mono` in `app/globals.css`
  - native shell uses `Avenir Next` and `Menlo` in `native/qt-shell/qml/ConsoleTheme.qml`
  - there is no native font-bundling or `QFontDatabase::addApplicationFont` path in `native/qt-shell/src/main.cpp`
- surface and palette mismatch:
  - legacy renderer uses layered gradients, a subtle grid, blur, richer shadows, and darker cards in `app/globals.css`
  - native shell still uses a flatter palette in `native/qt-shell/qml/ConsoleTheme.qml`
- density and overflow mismatch:
  - many operator-facing QML panels still depend on fixed `font.pixelSize`, `implicitHeight`, and `Math.min(...)` constraints
  - current hotspots include `native/qt-shell/qml/SetupControlSurfacePanel.qml`, `native/qt-shell/qml/SetupWorkspacePanel.qml`, `native/qt-shell/qml/AudioSelectedStripPanel.qml`, and `native/qt-shell/qml/PlanningProjectDetailDialog.qml`
- evidence hygiene gap:
  - some live evidence must be treated as stale until reverified, especially the current `support-open` native screenshot

These gaps are visible in the current parity oracles:

- planning:
  - legacy `artifacts/parity/legacy/operator-2560x1440/planning-populated.png`
  - native `artifacts/parity/native/workstation/planning-populated.png`
- lighting:
  - legacy `artifacts/parity/legacy/operator-2560x1440/lighting-populated.png`
  - native `artifacts/parity/live/manual-lighting-rerun.png`
- audio:
  - legacy `artifacts/parity/legacy/operator-2560x1440/audio-populated.png`
  - native `artifacts/parity/live/2026-04-20T08-55-08-990Z-audio-populated.png`
- setup required:
  - legacy `artifacts/parity/legacy/operator-2560x1440/setup-required.png`
  - native `artifacts/parity/live/2026-04-19T16-10-09-767Z-setup-required.png`
- control surface:
  - legacy `artifacts/parity/legacy/operator-2560x1440/setup-control-selected.png`
  - native `artifacts/parity/live/setup-control-selected-latest.png`

## Immediate Program

Active blocking phase:

- shared visual-substrate reset

Implementation order:

1. rebuild the shared native visual substrate to match the legacy CSS authority:
   - bundle and load the legacy-equivalent font stack for QML
   - align theme tokens for surfaces, borders, shadows, grid/background treatment, chips, and modals
   - remove misleading token names and values that do not match their actual rendered role
2. remove the worst shared density and overflow bottlenecks before more slice polish:
   - replace tiny fixed text and rigid heights in shared controls and the largest operator shells
   - re-baseline setup/control-surface first because that slice currently exposes the most obvious overflow and typography failures
3. reverify the evidence set:
   - regenerate stale native live evidence, especially `support-open`
   - keep legacy and native captures paired for the same visual state
4. only then continue slice-by-slice visual parity passes:
   - setup/support/control-surface
   - lighting
   - dashboard/planning shell
   - audio
   - remaining dialogs and final global signoff

Release rule:

- no parity-incomplete native release
- no “mostly done” parity language
- no parity claims without screenshot and live-verification evidence

Verification rule:

1. launch the real native app fullscreen at `2560x1440`
2. use a deterministic verify state through `--operator-verify-action`
3. take a real screenshot
4. bring Codex back to the front
5. compare against the matching legacy reference before accepting the change

Use the checked-in live parity runner when possible:

```bash
npm run native:parity:live -- --action=planning-populated
```

Do not treat a slice as "complete" only because its workflow exists in QML and the live runner can open it. The slice must also sit on the corrected shared visual substrate and survive the fullscreen screenshot comparison without global theme drift.

Current dialog parity oracles also include:

- `artifacts/parity/legacy/operator-2560x1440/shortcuts-open.png`
- `artifacts/parity/legacy/operator-2560x1440/about-open.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-control-selected.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-control-page-nav.png`
- `artifacts/parity/legacy/operator-2560x1440/setup-control-dial-selected.png`
- `artifacts/parity/live/*-open-shortcuts.png`
- `artifacts/parity/live/*-open-about.png`
- `artifacts/parity/live/*-setup-control-selected.png`
- `artifacts/parity/live/*-setup-control-page-nav.png`
- `artifacts/parity/live/*-setup-control-dial-selected.png`
- `artifacts/parity/native/workstation/setup-control-selected.png`
- `artifacts/parity/native/workstation/setup-control-page-nav.png`
- `artifacts/parity/native/workstation/setup-control-dial-selected.png`
