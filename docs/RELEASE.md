# Release

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

The packaged application still uses the legacy Electron bundle/install identity from the earlier product name. Treat changes to:

- `electron-builder.yml` `appId`
- `electron-builder.yml` `productName`
- `electron/notarize.js` bundle id

as a coordinated release migration, not a routine cleanup task. Those values affect installer identity, auto-update continuity, and existing operator installations.

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

## Release Checklist

1. Confirm version and changelog are correct.
2. Confirm `npm run release:check` passes for the target tag.
3. Verify local startup, shutdown, and tray / dock behavior.
4. Verify backup export and restore on a test database.
5. Verify lighting blackout on quit.
6. Verify Companion profile download still works.
7. Create and push a `v*` tag.
8. Wait for `.github/workflows/release.yml` to validate metadata, create the GitHub release, and produce installers.
9. Smoke-test the generated macOS and Windows installers.
10. Verify auto-update metadata was published with the release artifacts.

## Manual Rebuilds

If packaging failed after the tag already exists, rerun the `Release` workflow with `workflow_dispatch` and provide the existing `v*` tag. This rebuilds and republishes the tagged release without creating a new version.

## Signing / Notarization

### macOS

Required secrets:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

### Windows

Optional but recommended:

- `WIN_CSC_LINK`
- `WIN_CSC_KEY_PASSWORD`

## Post-release Smoke Test

Test on a clean machine or VM when possible:

1. Install the app.
2. Launch and confirm the splash transitions into the console.
3. Close the window and verify expected tray/dock behavior.
4. Reopen and confirm planning data is still present.
5. Trigger a manual backup export.
6. Download the Companion profile and import it.

## Rollback

If a release is bad:

1. Pull the previous known-good installer from GitHub Releases.
2. Restore the previous tag as the latest supported operator build.
3. Keep the user data directory intact unless the data migration itself is the cause.
4. If data was affected, restore from the most recent valid backup after reinstalling the known-good build.
