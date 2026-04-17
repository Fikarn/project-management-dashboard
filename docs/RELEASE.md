# Release

## Operator Targets

Production packaging now targets:

- Windows 11 `x64` via a Qt Installer Framework offline installer
- macOS Apple Silicon via a Qt Installer Framework offline installer
- GitHub Releases as the distribution surface for installers, packaged bundle zips, and native update-repository archives

The visible product name remains `SSE ExEd Studio Control`.

## Native Status

The tagged release path is now native-first:

- Electron is no longer part of the tagged release workflow.
- Native macOS and Windows jobs build packaged bundles, smoke-test them, build offline installers, and generate maintenance-tool update-repository archives.
- The legacy browser/Electron runtime still exists in the repo as a compatibility and rollback surface, but it is not the release-critical path anymore.

## Native Release Artifacts

Each tagged release should publish:

- `SSE-ExEd-Studio-Control-Native-macOS-Installer.zip`
- `SSE-ExEd-Studio-Control-Native-windows-Installer.exe`
- `SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip`
- `SSE-ExEd-Studio-Control-Native-windows-UpdateRepository.zip`

The release workflow may also publish packaged native bundle zips for support and smoke validation:

- `SSE-ExEd-Studio-Control-Native-macOS.zip`
- `SSE-ExEd-Studio-Control-Native-windows.zip`

## Installer And Update Strategy

The approved native packaging posture is:

- use Qt Installer Framework for installers
- ship offline installers first on both platforms
- publish maintenance-tool update repositories alongside the installers
- add platform signing and notarization before operator rollout
- prefer conservative maintenance-tool updates over silent background update behavior

Repo commands for the native release path:

- `npm run native:installer:mac:prepare`
- `npm run native:installer:mac:local`
- `npm run native:installer:win:prepare`
- `npm run native:installer:win:local`
- `npm run native:update-repo:mac:prepare`
- `npm run native:update-repo:mac:local`
- `npm run native:update-repo:win:prepare`
- `npm run native:update-repo:win:local`
- `npm run native:package:mac:acceptance`
- `npm run native:package:win:acceptance`
- `npm run native:artifacts:mac:verify`
- `npm run native:artifacts:win:verify`

The prepare commands stage QtIFW metadata and payload layout. The local commands run `binarycreator` or `repogen` when QtIFW is installed and the tools are available on `PATH` or via `SSE_QT_IFW_BINARYCREATOR` / `SSE_QT_IFW_REPOGEN`.
The packaged acceptance commands verify that the packaged shell and bundled engine can import data, reopen against the same app-data directory, restore a support backup, and relaunch without losing operator state.
The artifact verification commands assert the expected package identity, staged payload names, and final installer/update archive outputs after those builds complete.

## Standard Flow

The release process is changelog-driven and tag-driven:

1. Land all product and engineering changes on `main`.
2. Bump `package.json` and `package-lock.json` with:

```bash
npm version --no-git-tag-version 1.13.0
```

3. Move release notes from `[Unreleased]` into a new `## [1.13.0] — YYYY-MM-DD` section in `CHANGELOG.md`.
4. Run the local release gate:

```bash
npm run release:verify
```

That command runs the native release gate end to end. When QtIFW tools are available on `PATH` or via `SSE_QT_IFW_BINARYCREATOR` / `SSE_QT_IFW_REPOGEN`, it verifies the real installer and update-repository outputs; otherwise it falls back to staged artifact verification against the prepared QtIFW layout.

5. Commit the release prep:

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "release: v1.13.0"
```

6. Push `main`, then create and push the tag:

```bash
git push origin main
git tag -a v1.13.0 -m "v1.13.0"
git push origin v1.13.0
```

7. GitHub Actions validates release metadata, creates or updates the GitHub release from the changelog section, then builds and uploads the native installers and native update-repository archives.

## Release Guardrails

These checks run locally or in CI:

```bash
npm run release:check
npm run release:notes -- --tag v1.13.0 --out /tmp/release-notes.md
```

What they enforce:

- `package.json` version must match the release tag
- `CHANGELOG.md` must contain a non-empty section for that version
- the latest released changelog section must match the tagged version
- GitHub release notes come directly from the matching changelog section

## Installer Identity

The product identity is locked for operator rollout:

- visible product name: `SSE ExEd Studio Control`
- packaged app identifier: `com.sse.exedstudiocontrol`
- QtIFW package identifier: `com.sse.exedstudiocontrol.native`

Do not change these identifiers casually once installed operator builds exist. Any future change is an installer or update-migration task.

## Signing

Production readiness still requires trusted installs on both target platforms:

- Windows: sign the installer and packaged app to reduce SmartScreen friction
- macOS: Developer ID signing plus notarization for Apple Silicon installer distribution

## Preflight

Before creating a release tag, confirm:

```bash
npm run release:check
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run release:verify
```

Platform-specific local verification:

On macOS hosts:

```bash
npm run native:release:mac:local
```

On Windows hosts:

```bash
npm run native:release:win:local
```

On non-target hosts, `npm run release:verify` skips the installer and update-repository build step and prints a reminder to validate on macOS or Windows.

## Release Checklist

1. Confirm version and changelog are correct.
2. Confirm `npm run release:check` passes for the target tag.
3. Verify visible branding is `SSE ExEd Studio Control` across shell, installer, and release page.
4. Verify native startup routes correctly into commissioning or dashboard from the packaged build.
5. Verify backup export and restore on a test database.
6. Verify lighting/audio/control-surface recovery signals are visible from the native shell.
7. Create and push a `v*` tag.
8. Wait for `.github/workflows/release.yml` to publish the native installers and native update-repository archives.
9. Smoke-test the generated macOS and Windows installers from GitHub Releases.
10. Verify the release includes both platform update-repository archives.
11. Capture install and update notes for anything that would surprise the next operator or maintainer.

## Manual Rebuilds

If packaging failed after the tag already exists, rerun the `Release` workflow with `workflow_dispatch` and provide the existing `v*` tag. This rebuilds and republishes the tagged release without creating a new version.

## Post-release Smoke Test

Test on a clean machine or VM when possible:

1. Install the app from the offline installer.
2. Launch and confirm commissioning or dashboard routing is correct for that machine state.
3. Verify restart and shutdown behavior remain deterministic.
4. Reopen and confirm planning data is still present.
5. Trigger a manual support backup export.
6. Download the Companion profile and import it.
7. Apply a newer tagged release through the maintenance-tool repository or a newer offline installer and verify user data is preserved.

## Rollback

If a release is bad:

1. Pull the previous known-good installer from GitHub Releases.
2. Preserve the user data directory unless the data migration itself is the cause.
3. If needed, restore from the most recent valid support backup after reinstalling the known-good build.
4. Keep notes on any installer or update-repository issue that must be fixed before the next tag.
