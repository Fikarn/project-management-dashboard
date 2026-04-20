# Native Migration Board

## Purpose

This board now tracks one program, not two competing narratives:

- the native architecture migration is real and worth preserving
- operator-visible parity with the legacy Electron app is not signed off yet

The native app is not release-ready until legacy parity is proven slice by slice.

## Release Rule

- no parity-incomplete native release
- no “mostly done” parity framing
- no parity claims without screenshot and live-verification evidence

The legacy Electron app remains the exact acceptance oracle for layout, density, workflow order, keyboard behavior, restored state, and modal sequencing.

## Current Posture

As of `2026-04-20`:

- backend/runtime separation in `Rust + Qt/QML` is real and remains the target architecture
- shared QML design-system work exists and carries native versions of the recovered dashboard, planning, lighting, audio, setup, and dialog surfaces
- a full-program audit on `2026-04-20` verified that visual parity is still blocked by shared font, palette, density, and overflow mismatches
- the active parity phase is now `shared visual-substrate reset`
- the program is still not parity-complete until the substrate reset and the downstream visual re-baselines are signed off

Do not read backend migration progress as proof of operator parity.

## Primary Target

All operator parity work is judged first on the permanent fullscreen second-monitor target:

- resolution: `2560x1440`
- mode: fullscreen
- orientation: operator surface always visible

Other sizes remain compatibility targets, not the design authority.

## Active Workstreams

| ID | Workstream | Scope | Gate | Status |
| --- | --- | --- | --- | --- |
| `P0` | Repo truth and release posture | docs, boards, release language, parity signoff rule | repo no longer overstates parity or release readiness | In Progress |
| `P1` | Parity verification substrate | live verification path, engine-owned parity fixtures, screenshot workflow, legacy/native comparison discipline | deterministic live states are available in the real app | In Progress |
| `P2` | Shared visual-substrate reset | font strategy, shared palette, surface treatment, spacing/density scale, overflow bottlenecks, evidence hygiene | native shared theme and typography are materially aligned with the legacy CSS authority | In Progress |
| `P3` | Dashboard + planning visual re-baseline | fullscreen shell rules, dashboard framing, planning board/modals, keyboard/help flows | dashboard and planning survive screenshot comparison on the corrected substrate | Pending |
| `P4` | Lighting visual re-baseline | operator-visible layout, hierarchy, editor density, live control affordances, console continuity | lighting survives screenshot comparison on the corrected substrate | Pending |
| `P5` | Audio visual re-baseline | strip density, snapshot rail, readiness framing, selected-strip context, meter/status grouping | audio survives screenshot comparison on the corrected substrate | Pending |
| `P6` | Setup + support + control-surface visual re-baseline | startup routing, commissioning parity, support/recovery surfaces, control-surface rail/detail parity | setup/support/control-surface survive screenshot comparison on the corrected substrate | Pending |
| `P7` | Remaining dialogs and full-program signoff | keyboard help, about, any remaining operator dialogs, regression cleanup | every operator-visible surface is signed off with live and deterministic evidence | Pending |

## Shared Substrate Gate

`P2` is the current blocking phase. It passes only when all of the following are true:

1. the native shell uses a font strategy that reproduces the legacy UI stack closely enough to survive fullscreen screenshot comparison
2. shared QML colors, surfaces, borders, and modal treatments are aligned with `app/globals.css`
3. the worst fixed tiny-text and rigid-height bottlenecks are removed from the largest overflow hotspots
4. stale live evidence has been regenerated, especially for support/setup states
5. downstream slices can be judged on local parity rather than obvious global theme drift

Current active gate:

- do not continue broad slice polish until the shared visual substrate reset is complete enough to make screenshot comparisons meaningful again

## Historical Note

The repo still contains meaningful completed migration work:

- native process supervision and startup handshake
- engine-owned storage/bootstrap/import
- engine-owned planning, commissioning, lighting, audio, support, and control-surface contracts
- packaging and release plumbing

That work is necessary, but it is not by itself acceptance evidence for the operator product.
