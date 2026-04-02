# Contributing

## Prerequisites

- Node.js 20 (`.nvmrc` — use `nvm use` to switch)
- Run `npm install` then `npm run seed` to create the initial database

## Development

```bash
npm run dev                  # Next.js dev server at localhost:3000
npm run electron:dev:open    # Electron pointing at dev server (fast, no build required)
npm run electron:dev         # Electron with a fresh Next.js build
```

### Running on macOS without a code signing certificate

`electron:dev:open` and `electron:dev` run Electron directly — no signing needed, use these for day-to-day development.

To test a fully packaged `.dmg` locally (e.g., to verify the installer or auto-update logic), use the unsigned local build script:

```bash
npm run electron:dist:mac:local
```

This sets `CSC_IDENTITY_AUTO_DISCOVERY=false` to skip signing entirely and uses `--publish never` so nothing is uploaded. The resulting `.dmg` in `release/` will open on your own Mac without issues. It will be blocked by Gatekeeper on anyone else's machine — that's expected for unsigned local builds.

The release CI (`release.yml`) uses `--publish always` with code signing secrets and handles production builds for distribution.

## Before Submitting a PR

All of these must pass:

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # Next.js build (= type-check)
npm test              # Vitest unit + API tests
npm run test:e2e      # Playwright E2E tests (requires dev server running)
```

Pre-commit hooks (Husky + lint-staged) run Prettier and ESLint automatically on staged files.

## Conventions

See [CLAUDE.md](CLAUDE.md) for the full architecture reference, conventions, and known pitfalls. Key rules:

- **All mutation routes** (POST/PUT/DELETE/PATCH) must be wrapped: `export const POST = withErrorHandling(async (req) => { ... })`
- **All GET routes** must be wrapped: `export const GET = withGetHandler(async (req) => { ... })`
- **All mutations** must call `logActivity()` before returning
- **New API routes** must use `getCorsHeaders(req)` and handle `OPTIONS`
- **All modals** must use the shared `<Modal>` wrapper from `app/components/Modal.tsx`
- **IDs** are generated via `generateId(prefix)` from `lib/id.ts`

## Adding a New Field to `Light` (or Any DB Type)

When adding a required field to `Light`, you must update all five of these locations or the TypeScript build will fail:

1. `lib/types.ts` — the interface
2. `lib/db.ts` — `migrateDB()` backfill (so existing `db.json` files don't break)
3. `app/api/lights/route.ts` — creation route
4. `__tests__/helpers/fixtures.ts` — `makeLight()` test helper
5. `scripts/seed.ts` — seed data

## DMX / Lighting Changes

After editing any file in the DMX/effects path (`lib/dmx.ts`, `lib/effects.ts`, `lib/light-types.ts`), **kill all node processes and restart the dev server**. Next.js hot-reload creates new module instances but the old `globalThis` singletons (sACN sender, live state, fade state, effect intervals) persist from the previous load.

## Testing

- Unit and API tests (`__tests__/`): each test gets an isolated temp `DB_DIR` and resets all `globalThis` singletons in `__tests__/setup.ts`
- E2E tests (`e2e/`): run sequentially (`workers: 1`) against a shared live server; each test resets the DB via `POST /api/backup/restore` in the custom fixture
- Import `{ test, expect }` from `./fixtures` in E2E specs, not from `@playwright/test`

## Changelog

Update the `[Unreleased]` section in `CHANGELOG.md` with every PR. On release, rename `[Unreleased]` to the version number and date, and open a new empty `[Unreleased]` section.
