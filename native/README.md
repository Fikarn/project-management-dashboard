# Native Workspace

This directory contains the first scaffold for the approved end-state runtime:

- `qt-shell/`: Qt/QML desktop shell
- `rust-engine/`: Rust control engine
- `protocol/`: transport and message contract

The current Electron/Next runtime still exists elsewhere in the repo. This workspace is the new native direction and is intentionally isolated from the current product until the contract and startup model are stable.

## Repo Commands

From the repo root, prefer the wrapped commands:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:smoke
npm run native:smoke:bundled-engine
npm run native:smoke:lifecycle
npm run native:smoke:failures
npm run native:acceptance
```

## Local Build

Rust engine:

```bash
cd native/rust-engine
cargo check
```

Qt shell:

```bash
cmake -S native -B native/build -DCMAKE_PREFIX_PATH=/opt/homebrew/opt/qt
cmake --build native/build --parallel 4
```

Native startup smoke test:

```bash
SSE_APP_DATA_DIR=/tmp/sse-qt-shell-smoke \
SSE_LOG_DIR=/tmp/sse-qt-shell-smoke/logs \
native/build/qt-shell/sse_exed_native.app/Contents/MacOS/sse_exed_native -platform offscreen --smoke-test
```

Notes:

- use `native/build`, not `/tmp`, for local macOS builds because `/tmp` resolves through `/private/tmp` and can break Qt-generated relative include paths
- on macOS with Homebrew Qt, `CMAKE_PREFIX_PATH=/opt/homebrew/opt/qt` is required unless your environment already exports the Qt CMake package location
- the Qt shell now auto-discovers a locally built development engine at `native/rust-engine/target/debug/` or `native/rust-engine/target/release/` before falling back to PATH lookup
- `SSE_APP_DATA_DIR` and `SSE_LOG_DIR` are respected by the shell runtime, which makes sandboxed smoke tests and isolated local runs deterministic
- shell settings now persist through the Rust engine, including workspace plus window size/maximized state
- when native planning tables are empty, the engine will auto-import a legacy `db.json` from `SSE_LEGACY_DB_PATH` or, in repo-local development, from `data/db.json`
- set `SSE_DISABLE_AUTO_IMPORT=1` to disable startup auto-import
