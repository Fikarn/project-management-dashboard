# CLAUDE.md

Automation notes for code agents working in this repository.

## Source of Truth

Start with the durable docs instead of copying architecture details into this file:

- `README.md`: product shape and repo entry points
- `CONTRIBUTING.md`: validation expectations and contribution rules
- `docs/ARCHITECTURE.md`: runtime and domain boundaries
- `docs/HARDWARE_PROFILE.md`: supported studio hardware and scope
- `docs/OPERATIONS.md`: operator/runtime recovery expectations
- `docs/RELEASE.md`: versioning, tagging, and release flow

Keep this file short. If a workflow or architecture rule changes, update the durable docs first, then adjust this file only if automation guidance also needs to change.

## Product Scope

This is a local-first studio control console for a fixed hardware profile. It is optimized for:

- a dedicated second monitor
- lighting control
- RME Fireface UFX III audio control
- Stream Deck / Companion commissioning
- production planning as a secondary workspace

Do not treat it like a generic SaaS dashboard or a broad hardware abstraction project unless the repo is explicitly re-scoped.

## Codebase Map

- `app/components/*`: UI by domain
- `app/api/*`: request handling
- `lib/*`: domain logic, persistence, device adapters, client API wrappers
- `electron/*`: desktop runtime lifecycle
- `docs/*`: durable engineering and product documentation

Prefer adding code in the correct domain module over expanding top-level shell files.

## Safety Rules

- Avoid silent live-state writes on page open unless that behavior is intentional and documented.
- Keep persisted state explicit and serializable.
- Route writes should validate input before mutating local data.
- Hardware-facing changes should preserve operator safety and recovery behavior.
- If supported hardware assumptions change, update `docs/HARDWARE_PROFILE.md`.

## Validation Rules

Match validation to change risk:

- UI-only polish: `npm run lint` and `npm run build`
- Logic, routes, persistence, or adapters: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`
- Operator workflows or layout: `npm run lint`, `npm run build`, `npm run test:e2e`
- Electron or release behavior: `npm run release:verify`

Use `npm run clean` when generated artifacts are getting in the way of development or review.
