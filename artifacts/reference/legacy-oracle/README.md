# Legacy Parity Oracle (archived)

Frozen historical reference. **Read-only.** Do not add, modify, or delete files under this directory.

## What this is

Operator-screen captures from the legacy Electron/Next.js runtime at `operator-2560x1440`. These captures were the parity oracle against which the native Qt/QML shell was verified during the `v2.0.x` migration program.

## Why it is kept

The legacy runtime was retired in `v2.1.0`. The oracle captures are preserved as:

- a forensic baseline for diagnosing long-tail visual regressions against the historical product surface
- a source of truth for the original operator-facing layout choices that informed the native shell

## Status

- Frozen at the `v2.1.0` release.
- No CI or automation references this directory.
- The live native parity evidence set lives at `artifacts/parity/native/` and `artifacts/parity/native-onscreen/`.
- Related archival doc: [`docs/archive/NATIVE_PARITY_HANDOFF.md`](../../../docs/archive/NATIVE_PARITY_HANDOFF.md).

If new parity work is needed in the future, create a fresh evidence directory under `artifacts/parity/` rather than modifying this archive.
