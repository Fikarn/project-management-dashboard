# Legacy Runtime

This document describes the old browser/Next.js plus Electron runtime that still exists in the repo as a reference and rollback surface.

It is not the current product.

The current product and tagged release path are the native Qt/QML shell plus Rust engine.

## Status

Treat the legacy runtime as:

- archival reference code for parity lookups
- rollback surface if a native regression needs comparison
- development-only support for old Electron lifecycle behavior that has not been deleted yet

Do not treat it as:

- the current desktop product
- the current release path
- the default path for new feature work

## Legacy Commands

Use these only when you explicitly need the old runtime:

```bash
npm run legacy:browser:dev
npm run legacy:browser:build
npm run legacy:browser:start
npm run legacy:seed
npm run legacy:electron:dev
npm run legacy:electron:dev:open
npm run legacy:electron:build
npm run legacy:electron:dist
npm run legacy:electron:dist:mac
npm run legacy:electron:dist:mac:local
npm run legacy:electron:dist:win
npm run legacy:electron:dist:win:local
```

The older `dev`, `build`, `start`, `seed`, and `electron:*` script names still exist for compatibility, but the `legacy:*` aliases are the preferred way to invoke those paths now.

## When To Use It

Use the legacy runtime only for:

- comparing native behavior against the old implementation
- reading old Electron lifecycle behavior
- validating importer assumptions against the old `db.json` shape
- emergency rollback during native rollout if a workstation-specific issue appears

If you are building or verifying the current product, use the native commands instead.

## Current Product Path

For the actual product and release path, use:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:smoke
npm run native:package:mac:smoke
npm run native:package:win:smoke
npm run release:verify
```
