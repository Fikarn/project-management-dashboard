# Productization Plan

## Goal

Ship `SSE ExEd Studio Control` as a production-grade native desktop product for:

- Windows 11 `x64`
- macOS Apple Silicon

The full journey should feel production-ready from the GitHub repo page through install, first launch, setup, normal use, update, and rollback.

## Locked Decisions

- Product name: `SSE ExEd Studio Control`
- Distribution: direct download from GitHub Releases
- Windows packaging: Qt Installer Framework offline installer
- macOS packaging: Qt Installer Framework offline installer
- Update channel: Qt Installer Framework maintenance-tool update repository
- Primary deployment profile: one fixed studio workstation

## Open Decisions

These still need deliberate production rollout ownership:

1. Signing ownership
   Confirm who owns the Windows code-signing certificate and the Apple Developer account or team.

## Workstreams

### 1. Product Identity And Packaging

- [x] Lock the visible product name to `SSE ExEd Studio Control`
- [x] Freeze the final bundle and app identifier as `com.sse.exedstudiocontrol`
- [x] Align installer names, shell titles, release metadata, and Companion labels
- [x] Replace Electron release artifacts with native installers and native update-repository archives
- [ ] Verify installer and update continuity from the first production release onward

Exit criteria:

- every visible app surface uses the same product name
- installer and update identity choices are documented and no longer ambiguous

### 2. Repo And Download Surface

- [x] Rewrite the repo landing page around packaged native desktop installs
- [x] Keep a concrete productization plan in the repo
- [ ] Add polished screenshots or release artwork for the GitHub repo and releases
- [x] Make the latest release page easy to understand for a first-time operator

Exit criteria:

- a new user can land on the repo and immediately understand what to download and what to expect

### 3. Release Pipeline And Trust

- [x] Keep cross-platform tagged-release automation in place
- [x] Build native Windows and macOS installers in release automation
- [x] Build native maintenance-tool update-repository archives in release automation
- [x] Publish SHA256 manifests for native release artifacts
- [x] Verify native package, installer, and update-repository artifact identity in CI and release validation
- [x] Add previous-tag continuity checks for native installer and maintenance-tool metadata
- [x] Add optional macOS signing and notarization hooks to release automation
- [x] Add optional Windows signing hooks to release automation
- [ ] Configure Windows signing secrets and validate a signed installer build
- [ ] Configure Apple signing and notarization secrets and validate a trusted macOS installer build
- [x] Add an explicit release acceptance checklist for installer and update verification

Exit criteria:

- tagged releases publish the native installers and update-repository archives
- Windows installs cleanly without avoidable SmartScreen friction
- macOS installs cleanly without avoidable Gatekeeper or notarization friction

### 4. Installed-App Experience

- [x] Keep operator-visible versioning and recovery information inside the product surfaces
- [x] Keep first-run commissioning understandable and recoverable
- [x] Keep startup routing and restored shell state engine-owned
- [x] Review shutdown, recovery, and update instructions for operator clarity on clean machines

Exit criteria:

- operators can tell what version they are running, how updates arrive, and how to recover safely

### 5. Clean-Machine QA

- [x] Add clean-start verification for packaged native startup
- [x] Add restart, rollback, and restore acceptance coverage
- [x] Add packaged continuity and rollback acceptance against preserved native app-data directories
- [ ] Confirm clean-machine Windows install in CI or release validation
- [ ] Confirm clean-machine macOS install in CI or release validation
- [ ] Verify update application from one tagged native release to the next
- [ ] Verify rollback and reinstall preserve user data

Exit criteria:

- the release process is validated from the actual native installers and update artifacts, not only from local development builds

## Acceptance Checklist

Before calling the productization pass complete, confirm:

1. The repo page, README, and latest release page all refer to `SSE ExEd Studio Control`.
2. Windows and macOS native installers are downloadable from GitHub Releases.
3. Native update-repository archives are published with each tagged release.
4. First launch reaches commissioning or dashboard reliably on a clean machine.
5. Setup is understandable and recoverable if deferred.
6. Normal close, reopen, restart, and restore behavior is predictable.
7. An update can be applied without losing user data.
8. Rollback steps are documented and tested.

## Current Implementation Slice

The current focus is:

- closing the remaining clean-machine install and update continuity gaps
- hardening the documented update and rollback flow around the native installers and maintenance-tool repository
- landing signing and notarization so the native installers are trusted on operator machines
