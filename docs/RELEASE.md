# Release

## Operator Targets

Production packaging currently targets:

- Windows 11 `x64` via NSIS installer
- macOS Apple Silicon via DMG
- GitHub Releases as the installer and auto-update backend

The visible product name is now `SSE ExEd Studio Control`.

## Native Status

The repo is currently in a mixed state:

- Electron remains the production release-critical path.
- Native now has real macOS and Windows preview release lanes that build packaged desktop bundles, smoke-test them with the bundled Rust engine, and upload zipped native bundles to GitHub Releases.
- Native installer posture, signing strategy, and updater strategy are still open migration work.

Do not treat the native artifact as the default operator release until the remaining migration gates pass.

## Native Preview Artifact

The native preview lanes currently publish:

- `SSE-ExEd-Studio-Control-Native-macOS.zip`
- `SSE-ExEd-Studio-Control-Native-windows.zip`

These are zipped desktop bundles, not yet final signed installers or an updater channel.

## Native Installer Strategy

The approved end-state native installer strategy is:

- use Qt Installer Framework for native installers
- ship offline installers first on both macOS and Windows
- sign installers on both target platforms before operator rollout
- use the maintenance-tool update flow first, before attempting silent background updates

This follows the native architecture plan directly. The current zipped preview bundles are validation artifacts, not the final installer/update channel.

## Expected Release Artifacts

Each tagged production release should publish:

- Windows installer
- Windows auto-update manifest and blockmap metadata
- macOS Apple Silicon DMG
- macOS auto-update manifest and blockmap metadata
- GitHub release notes generated from `CHANGELOG.md`

Smoke-test both packaged apps from the actual GitHub Release page, not just from local build output.

## Standard Flow

The release process is tag-driven and changelog-driven:

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

7. GitHub Actions validates the release metadata, creates or updates the GitHub release from the changelog section, then builds and uploads platform installers.

When the native preview lanes are healthy, the same tag also uploads zipped native macOS and Windows bundles.

## Release Guardrails

These checks now run locally or in CI:

```bash
npm run release:check
npm run release:notes -- --tag v1.13.0 --out /tmp/release-notes.md
```

What they enforce:

- `package.json` version must match the release tag.
- `CHANGELOG.md` must contain a non-empty section for that version.
- The latest released changelog section must match the tagged version.
- GitHub release notes come directly from the matching changelog section.

## Installer Identity

The product identity is now locked for the first production rollout:

- visible product name: `SSE ExEd Studio Control`
- packaged app identifier: `com.sse.exedstudiocontrol`

Do not change these identifiers casually once installed operator builds exist. Any future change is an installer/update migration task.

## Signing

Production readiness requires trusted installs on both target platforms:

- Windows: code-sign the installer and packaged app to reduce SmartScreen friction
- macOS: Developer ID signing plus notarization for Apple Silicon DMG releases

## Preflight

Before creating a release tag, confirm:

```bash
npm run release:check
npm run lint
npm run format:check
npm run test:coverage
npm run test:e2e
npm run electron:build
```

For the native preview lanes, also verify:

```bash
npm run native:release:mac:local
npm run native:package:mac:clean-smoke
```

On Windows hosts, also verify:

```bash
npm run native:release:win:local
npm run native:package:win:clean-smoke
```

## Unsigned Windows Verification

Before spending money on code signing, validate the local Windows installer flow with an unsigned build:

```bash
npm run electron:dist:win:local
```

Use that local installer build to verify:

- installer generation completes without publish credentials
- first launch reaches the console
- close confirmation fully quits the app
- open-at-login can be toggled from the About surface
- Companion profile download still uses the current product name

## Release Checklist

1. Confirm version and changelog are correct.
2. Confirm `npm run release:check` passes for the target tag.
3. Verify visible branding is `SSE ExEd Studio Control` across app, installer, and release page.
4. Verify local startup, shutdown, tray / dock behavior.
5. Verify backup export and restore on a test database.
6. Verify lighting blackout on quit.
7. Verify Companion profile download still works.
8. Create and push a `v*` tag.
9. Wait for `.github/workflows/release.yml` to validate metadata, create the GitHub release, and produce installers.
10. Smoke-test the generated macOS and Windows installers from GitHub Releases.
11. Verify auto-update metadata was published with the release artifacts.
12. Capture install and update notes for anything that would surprise the next operator or maintainer.

If the native preview lane is in scope for the release:

13. Download the native macOS and Windows zip artifacts from GitHub Releases.
14. Confirm each packaged native app starts with its bundled Rust engine.
15. Confirm the native recovery surface and planning/dashboard startup path still behave as expected.

## Manual Rebuilds

If packaging failed after the tag already exists, rerun the `Release` workflow with `workflow_dispatch` and provide the existing `v*` tag. This rebuilds and republishes the tagged release without creating a new version.

## Signing / Notarization

### macOS

Required secrets for Apple Silicon production builds:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

### Windows

Required for production readiness:

- `WIN_CSC_LINK`
- `WIN_CSC_KEY_PASSWORD`

## Post-release Smoke Test

Test on a clean machine or VM when possible:

1. Install the app.
2. Launch and confirm the splash transitions into the console.
3. Complete first-run commissioning or confirm the setup flow can be reopened later.
4. Close the window and verify expected tray/dock behavior.
5. Reopen and confirm planning data is still present.
6. Trigger a manual backup export.
7. Download the Companion profile and import it.
8. Install a newer tagged release and verify the updater path preserves user data.

## Rollback

If a release is bad:

1. Pull the previous known-good installer from GitHub Releases.
2. Restore the previous tag as the latest supported operator build.
3. Keep the user data directory intact unless the data migration itself is the cause.
4. If data was affected, restore from the most recent valid backup after reinstalling the known-good build.
