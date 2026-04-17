## Summary

<!-- What changed? Keep this operator-focused and concrete. -->

## Why

<!-- Why was this change needed? What problem, risk, or workflow does it address? -->

## Risks

<!-- What could regress? Note any hardware, operator, migration, or packaging risk. -->

## Validation

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:coverage` when logic, routes, persistence, or adapters changed
- [ ] `npm run native:shell:test` when native operator-shell logic or layout changed
- [ ] `npm run native:smoke` when native startup or shell integration changed
- [ ] `npm run native:acceptance` when native persistence, recovery, or release-critical behavior changed
- [ ] `npm run test:e2e` when operator flows, layout, or setup changed
- [ ] `npm run release:check` when preparing a tagged release
- [ ] Manual validation completed for affected hardware / live workflows

## Product Areas

- [ ] Planning / dashboard
- [ ] Lighting
- [ ] Audio
- [ ] Setup / commissioning
- [ ] Stream Deck / Companion
- [ ] Native shell / packaging / updater
- [ ] Legacy fallback / parity oracle

## Screenshots or Recording

<!-- Include before/after screenshots or a short clip for UI and operator workflow changes. -->

## Documentation

- [ ] README or docs updated when behavior or setup changed
- [ ] Legacy parity expectation updated when the benchmark changed
- [ ] `CHANGELOG.md` updated for user-facing changes
