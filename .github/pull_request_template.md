## What

<!-- Brief description of the change -->

## Why

<!-- Motivation — what problem does this solve, or what prompted it? -->

## Testing done

- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run build` (type-check) passes
- [ ] Manually tested in browser
- [ ] Manually tested in Electron (if touching `electron/` or `lib/dmx.ts`)

## CLAUDE.md checklist

- [ ] New routes wrapped with `withErrorHandling()` / `withGetHandler()`
- [ ] Mutations call `logActivity()` before returning
- [ ] New `Light` fields updated in all 5 required places (if applicable — see CLAUDE.md)
- [ ] `CHANGELOG.md` `[Unreleased]` section updated
