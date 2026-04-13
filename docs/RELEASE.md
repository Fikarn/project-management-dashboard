# Release

## Preflight

Before creating a release tag, run:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm run electron:build
```

## Release Checklist

1. Confirm version and changelog are correct.
2. Verify local startup, shutdown, and tray / dock behavior.
3. Verify backup export and restore on a test database.
4. Verify lighting blackout on quit.
5. Verify Companion profile download still works.
6. Create and push a `v*` tag.
7. Wait for `.github/workflows/release.yml` to produce installers.
8. Smoke-test the generated macOS and Windows installers.
9. Verify auto-update metadata was published with the release artifacts.

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
