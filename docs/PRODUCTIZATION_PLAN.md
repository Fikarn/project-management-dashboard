# Productization Plan

## Goal

Ship `SSE ExEd Studio Control` as a polished packaged desktop product for:

- Windows 11 `x64`
- macOS Apple Silicon

The full user journey should feel production-ready from the GitHub repo page through install, first launch, setup, normal use, update, and quit.

## Locked Decisions

- Product name: `SSE ExEd Studio Control`
- Distribution: direct download from GitHub Releases
- Windows packaging: NSIS installer
- macOS packaging: Apple Silicon DMG
- Update channel: `electron-updater` pointed at GitHub Releases
- Primary deployment profile: one fixed studio workstation

## Open Decisions

These should be decided deliberately before the first signed production rollout:

1. Signing ownership
   Confirm who owns the Windows code-signing certificate and the Apple Developer account / team.

## Workstreams

### 1. Product Identity And Packaging

- [x] Lock the visible product name to `SSE ExEd Studio Control`
- [x] Freeze the final bundle/app identifier as `com.sse.exedstudiocontrol`
- [x] Align installer names, DMG title, tray/window titles, splash, metadata, and Companion labels
- [ ] Verify installer/update continuity from the first production release onward

Exit criteria:

- Every visible app surface uses the same product name
- Installer/update identity choices are documented and no longer ambiguous

### 2. Repo And Download Surface

- [x] Rewrite the repo landing page around packaged installers instead of only local development
- [x] Add a concrete productization plan to the repo
- [ ] Add polished screenshots or release artwork for the GitHub repo and releases
- [ ] Make the latest release page easy to understand for a first-time operator

Exit criteria:

- A new user can land on the repo and immediately understand what to download and what to expect

### 3. Release Pipeline And Trust

- [x] Keep cross-platform tagged-release automation in place
- [ ] Configure Windows signing secrets and validate a signed installer build
- [ ] Configure Apple signing/notarization secrets and validate a notarized Apple Silicon DMG build
- [ ] Verify GitHub Releases include the exact updater metadata expected by `electron-updater`
- [ ] Add an explicit release acceptance checklist for installer and updater verification

Exit criteria:

- Windows installs cleanly without avoidable SmartScreen distrust
- macOS installs cleanly without avoidable Gatekeeper/notarization friction
- Both platforms can update from one tagged release to the next

### 4. Installed-App Experience

- [x] Add an About / version surface inside the app
- [x] Add a manual `Check for updates` action
- [x] Expose open-at-login as a user-facing preference with packaged builds defaulting to enabled
- [x] Change close behavior to confirm and fully quit on both platforms
- [ ] Review splash, first-run copy, setup recovery, and shutdown messaging for operator clarity

Exit criteria:

- Operators can tell what version they are running, how updates arrive, and how to actually quit the app

### 5. Clean-Machine QA

- [ ] Clean Windows 11 install test
- [ ] Clean macOS Apple Silicon install test
- [ ] First-run commissioning test
- [ ] Close/reopen persistence test
- [ ] Upgrade from older tagged release to newer tagged release
- [ ] Rollback/reinstall test with preserved data

Exit criteria:

- The release process is validated from the actual installer and update artifacts, not just from local development builds

## Acceptance Checklist

Before calling the productization pass complete, confirm:

1. The repo page, README, and latest release page all refer to `SSE ExEd Studio Control`
2. Windows and macOS installers are downloadable from GitHub Releases
3. The installed app uses the same branding as the repo and installer
4. First launch reaches the console reliably on a clean machine
5. Setup is understandable and recoverable if deferred
6. Normal close/reopen behavior is predictable on both platforms
7. An update can be downloaded and installed without losing user data
8. Release rollback steps are documented and tested

## Current Implementation Slice

This pass starts with the lowest-risk production work:

- visible branding rename
- repo/readme/install surface cleanup
- release and operations documentation updates

The next implementation slice should focus on:

- signed Windows and notarized macOS release validation
