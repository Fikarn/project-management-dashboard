# Native Closeout

This document records the release and rollout closeout work that followed the native parity recovery program.

## Current Closeout Status

The migration board and parity workstreams are complete in the repo. The required release validation and rollout proof work is now complete as well:

| Workstream | Scope                                                                | Owner                       | Current State                                                                                                                                                                                                                                                  | Stop / Go                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C1`       | Confirm the first native release anchor                              | Release Manager             | Complete on `2026-04-17`: `npm run release:anchor:verify -- --tag v2.0.0` confirmed `https://github.com/Fikarn/project-management-dashboard/releases/tag/v2.0.0`                                                                                               | Complete only when the published GitHub release has both installers, both update repositories, and both `SHA256` manifests                                |
| `C2`       | Validate the full Windows native release gate on a real Windows host | Release Engineer            | Complete on `2026-04-17`: a real Windows 11 `x64` host produced package, installer, update-repository, checksum, bridge, delivery, and real installer-acceptance evidence; the repo now defaults installer acceptance to a safe non-`~` path on Windows        | Complete only when `npm run native:release:win:local` exits `0` and the Windows release artifacts are written under `release/`                            |
| `C3`       | Validate the first native-to-native upgrade                          | QA / Release Engineer       | Complete on `2026-04-18`: an installed `v2.0.0` workstation was upgraded to `v2.0.1-rc.4`, preserved commissioning/startup state, preserved planning workspace selection, kept the control-surface bridge ready, and exported a Companion profile successfully | Complete only when an installed `v2.0.0` workstation upgrades to the next tagged native build without losing operator data or breaking startup / recovery |
| `C4`       | Retire fallback release-readiness                                    | Product Owner + Engineering | Complete on `2026-04-18`: repo docs and release policy were updated so native is the only release-ready desktop path and Electron remains comparison/rollback-only                                                                                             | Complete only when the docs and release policy describe native as the only release-ready desktop path                                                     |

## Workstream `C1` — Release Anchor

Use the existing `v2.0.0` tag as the first native release anchor.

1. Run:

```bash
npm run release:anchor:verify -- --tag v2.0.0
```

2. Open the GitHub release page for `v2.0.0`.
3. Confirm these assets exist:
   - `SSE-ExEd-Studio-Control-Native-macOS-Installer.zip`
   - `SSE-ExEd-Studio-Control-Native-windows-Installer.exe`
   - `SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip`
   - `SSE-ExEd-Studio-Control-Native-windows-UpdateRepository.zip`
   - `SSE-ExEd-Studio-Control-Native-macOS-SHA256.txt`
   - `SSE-ExEd-Studio-Control-Native-windows-SHA256.txt`
4. If a published asset is missing, rerun the `Release` workflow with `workflow_dispatch` and input `v2.0.0`.

Keep the GitHub Release URL as evidence.

## Workstream `C2` — Windows Real-Host Validation

This repo already contains the exact Windows gate. The remaining work is to run it on a real Windows 11 `x64` machine and keep the evidence.

### Prerequisites

- Node.js `20`
- npm
- Rust stable
- Qt `6.8.3` desktop SDK
- Qt Installer Framework

### Steps

1. Check out the branch or merge commit that contains the closeout fixes.
2. Run:

```bash
npm ci
npm run native:release:win:local
```

3. Keep the full terminal log.
4. Confirm these directories contain fresh artifacts:
   - `release/native/windows`
   - `release/native-installer/windows`
   - `release/native-updates/windows`
   - `release/checksums/windows`

### Required Phase Coverage

The Windows gate is only considered complete if the local run covers all of these phases successfully:

- `package`
- `bridge`
- `installer`
- `continuity`
- `delivery`
- `installer-acceptance`

If a real-host run is temporarily unavailable, a green GitHub Actions `native-foundation-windows` job is useful signal, but it does not replace the preferred local evidence.

## Workstream `C3` — First Native-To-Native Upgrade

Use a prerelease first so update mechanics are proven without forcing an immediate stable operator rollout. The actual validation path landed on `v2.0.1-rc.4` after intermediate prerelease fixes for installer-path handling, formatting, and lighting parity gating.

### Release Preparation

1. Start from `main` after `C1` and `C2` are complete.
2. Update the version metadata:

```bash
npm version --no-git-tag-version 2.0.1-rc.4
```

3. Move the release notes into a new `## [2.0.1-rc.4] — YYYY-MM-DD` section in `CHANGELOG.md`.
4. Run:

```bash
npm run release:check -- --tag v2.0.1-rc.4
npm run release:verify
```

5. Commit the release preparation on `main`.
6. Push `main`.
7. Create and push tag `v2.0.1-rc.4`.
8. Wait for the `Release` workflow to publish the prerelease artifacts.
9. Confirm the prerelease is published with:

```bash
npm run release:anchor:verify -- --tag v2.0.1-rc.4
```

### Upgrade Validation

Run this on a clean test workstation that already has `v2.0.0` installed.

1. Launch `v2.0.0`.
2. Confirm the startup target is correct for that workstation state.
3. Export a manual support backup.
4. Apply the `v2.0.1-rc.4` update through the maintenance-tool repository or the offline installer path.
5. Relaunch the app.
6. Confirm:
   - planning data is still present
   - lighting, audio, and support summaries still load
   - Companion export still works
   - the control-surface bridge is still available
   - startup routing and recovery guidance still behave as expected

Recorded result on `2026-04-18`:

- before version: `2.0.0`
- after version: `2.0.1-rc.4`
- update method: reinstall/upgrade with preserved app-data after the offline installer refused an in-place target overwrite
- startup state preserved: `commissioning`
- workspace preserved: `planning`
- commissioning stage preserved: `setup-required`
- hardware profile preserved: `sse-fixed-studio-v1`
- control-surface bridge remained ready
- Companion export succeeded after the upgrade

## Workstream `C4` — Retire Fallback Release-Readiness

Do not retire the Electron fallback until `C1`, `C2`, and `C3` are complete.

When `C3` succeeds:

1. Update:
   - `README.md`
   - `docs/LEGACY_RUNTIME.md`
   - `docs/PRODUCTIZATION_PLAN.md`
   - `docs/NATIVE_MIGRATION_BOARD.md`
   - `docs/RELEASE.md`
2. Remove language that still describes Electron as the fallback release path.
3. Keep historical parity-oracle language only if it is still useful.
4. Decide whether the `legacy:*` release commands stay for reference or get trimmed.

## Evidence To Keep

Keep the following evidence with the release ticket, PR, or handoff note:

- the URL for the complete `v2.0.0` GitHub Release
- one successful Windows `npm run native:release:win:local` log
- one successful macOS `npm run native:bridge:mac:verify` run
- one successful Windows `npm run native:bridge:win:verify` run
- one successful `v2.0.0` to `v2.0.1-rc.4` upgrade validation record
- one follow-up PR or commit that removes fallback release-readiness language after the upgrade pass succeeds
