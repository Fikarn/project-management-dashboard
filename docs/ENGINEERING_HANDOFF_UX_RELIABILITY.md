# Engineering Handoff: UX + Operational Reliability Program

## 1) Goal

Make the app safer and faster to operate in real production sessions (projects + lights + audio + Stream Deck), while reducing setup friction and improving confidence during failure modes.

This handoff turns the previously suggested improvements into implementation-ready workstreams for a senior engineer.

## 2) Product Context (Current State)

- Single dashboard app with 3 primary views: `kanban`, `lighting`, `audio`.
- Local-first JSON DB (`data/db.json`) with serialized writes in `mutateDB`.
- Realtime update model uses SSE (`/api/events`) with a generic `update` event.
- Safety-critical actions exist (delete, restore backup, all-lights off) but confirmation and recovery are inconsistent.
- Setup flow exists (`SetupWizard`) but some validations are advisory rather than enforced.

Primary implementation anchors:

- `app/components/Dashboard.tsx`
- `app/components/SetupWizard.tsx`
- `app/components/lighting/LightingView.tsx`
- `app/components/audio/AudioView.tsx`
- `app/components/shared/*`
- `app/api/*`
- `lib/db.ts`, `lib/client-api.ts`, `lib/types.ts`

## 3) Delivery Strategy (Recommended Sequence)

### Phase 1: Safety + Session Confidence (highest risk reduction)

1. System preflight gate
2. Safe mode for destructive actions
3. Backup restore preview/validation
4. Setup overlap hard validation

### Phase 2: Speed + Clarity

5. Global context strip
6. Command palette
7. Rich diagnostics panel

### Phase 3: Scale + Inclusivity

8. SSE domain-scoped updates/incremental fetch
9. Accessibility hardening
10. Operator mode

## 4) Workstreams

---

## WS1. System Preflight Gate

### Problem

Operators can enter live workflow without knowing whether critical subsystems are healthy.

### Scope

Create a pre-session gate that reports readiness before active use.

### Backend

Add `GET /api/system/preflight` that aggregates:

- DB health (`/api/health`)
- Backup health (`/api/health`)
- DMX status (`/api/lights/status`)
- OSC status (`/api/audio/status`)
- Stream Deck context endpoint sanity (`/api/deck/context`)

Suggested response shape:

```ts
{
  overall: "ready" | "degraded" | "blocked",
  checks: {
    db: { status: "pass" | "warn" | "fail", detail: string },
    backup: { status: "pass" | "warn" | "fail", detail: string },
    dmx: { status: "pass" | "warn" | "fail", detail: string },
    osc: { status: "pass" | "warn" | "fail", detail: string },
    deck: { status: "pass" | "warn" | "fail", detail: string }
  },
  timestamp: string
}
```

### Frontend

- Add `PreflightGate` component shown before main dashboard content.
- Provide:
  - `Start Session` (enabled if no `fail`)
  - `Start Anyway` (warned path, for degraded checks)
  - `Open Setup` shortcut
  - Retry button
- Persist temporary bypass in `localStorage` (e.g. `preflightBypassUntil`).

### Touch Points

- `app/components/Dashboard.tsx`
- `app/api/health/route.ts`
- `app/api/lights/status/route.ts`
- `app/api/audio/status/route.ts`
- new `app/api/system/preflight/route.ts`
- `lib/client-api.ts` (new `systemApi.preflight()`)

### Acceptance Criteria

- On cold start, user sees preflight status before operating controls.
- Any failing critical check is explicitly visible.
- User can intentionally bypass with warning.
- No regression to normal startup after passing checks.

### Tests

- API unit tests for preflight aggregation.
- E2E: blocked/degraded/ready states.
- E2E: bypass persistence and expiry.

---

## WS2. Safe Mode for Destructive Actions

### Problem

Critical actions are easy to trigger and recoverability is uneven.

### Scope

Introduce stronger confirmation and optional undo for destructive paths.

### Actions to cover

- Delete project/task/channel/light/group
- Restore backup
- `All Off` in lighting
- (Optional) Stream Deck delete actions

### UX Rules

- Default mode: current confirm dialog.
- Strict mode:
  - Hold-to-confirm button (1.2s) for high-impact actions.
  - Optional typed confirm for backup restore (e.g. type `RESTORE`).
  - Undo toast for delete actions (10s window) where practical.

### Data/Model

Add safety settings:

```ts
settings: {
  ...,
  safetyMode: "normal" | "strict"
}
```

### Touch Points

- `lib/types.ts` (`Settings`)
- `lib/db.ts` (default + migration)
- `app/api/settings/route.ts` (validation + persist)
- `app/components/shared/ConfirmDialog.tsx` (hold-to-confirm variant)
- `app/components/Dashboard.tsx`
- `app/components/lighting/LightingView.tsx`
- `app/components/audio/AudioView.tsx`
- delete API routes as needed

### Acceptance Criteria

- Strict mode prevents one-click destructive changes.
- Restore backup requires explicit high-confidence confirmation.
- Delete actions have clear, consistent confirmation UX.

### Tests

- Unit: settings migration/validation.
- Component: hold-to-confirm interaction.
- E2E: strict mode blocks single-click execution.

---

## WS3. Setup Wizard Validation Hardening

### Problem

DMX overlaps are detected but not enforced; some helper routines are non-effective for users.

### Scope

Make setup validation actionable and enforceable.

### Changes

- Block `Next` on address step if overlaps exist.
- Add one-click `Fix Overlaps` (sequential auto-assign).
- Validate bridge IP and universe before enabling `Next`.
- Remove or replace dead-end testing paths (e.g. test-light logic that does not target configured fixtures).

### Touch Points

- `app/components/SetupWizard.tsx`
- `app/api/lights/settings/route.ts` (if stricter validation is needed)

### Acceptance Criteria

- User cannot complete address step with overlapping channels.
- Validation messages indicate exactly which fixtures conflict.
- Setup completion yields a usable lighting state with fewer manual retries.

### Tests

- Component tests for overlap gating.
- E2E for PM+Lighting branch, including invalid -> fixed path.

---

## WS4. Diagnostics Panel (Actionable Failure Guidance)

### Problem

Connection tests provide limited context (`success`/`error`) and weak remediation guidance.

### Scope

Provide tiered diagnostics output and suggested remediation per subsystem.

### Backend

Add `GET /api/system/diagnostics` with per-check status + recommended next steps.

- Example checks: server reachable, SSE stream, DMX reachability, OSC ports, deck endpoints.

### Frontend

- Enhance Setup page `ConnectionTest` with structured output list.
- Add optional inline `Run Diagnostics` in dashboard help modal.

### Touch Points

- `app/setup/ConnectionTest.tsx`
- `app/setup/SetupPage.tsx`
- new `app/api/system/diagnostics/route.ts`
- `lib/client-api.ts`

### Acceptance Criteria

- Failures identify category (network, service, hardware, config).
- Users get direct remediation hints, not generic failure text.

### Tests

- API tests for each diagnostic state.
- E2E: diagnostics UI renders and updates status.

---

## WS5. Global Context Strip

### Problem

Cross-domain context (selected project/task/light/channel + running timer) is fragmented.

### Scope

Add persistent top-level context strip for fast orientation.

### Content

- Selected project + status + priority
- Selected task + timer state
- Selected light and scene
- Selected audio channel
- Live connection indicators (SSE, DMX, OSC)

### Implementation

- New lightweight endpoint `GET /api/context` (aggregated snapshot) or compose existing endpoints.
- Poll or SSE-refresh on relevant update events.

### Touch Points

- `app/components/Dashboard.tsx`
- new `app/components/shared/GlobalContextStrip.tsx`
- `app/api/deck/context/route.ts` (possible extension) or new endpoint

### Acceptance Criteria

- Operator can identify current control target at a glance.
- Strip remains accurate during rapid deck/dial operations.

### Tests

- Component tests for rendering with null/partial/full context.
- E2E with project/task selection changes.

---

## WS6. Command Palette

### Problem

Keyboard shortcuts are useful but low-discoverability and fixed.

### Scope

Introduce command palette (`Cmd/Ctrl+K`) for universal action/search.

### Commands (initial)

- Create project/task
- Switch view (Projects/Lights/Audio)
- Set filter/sort
- Select project/task
- Trigger export/report/setup
- Open key modals

### Implementation Notes

- Keep first iteration dependency-light (custom modal + indexed commands).
- Add command metadata: id, label, shortcut, group, `run()`.
- Respect `safetyMode` for destructive actions.

### Touch Points

- `app/components/Dashboard.tsx`
- new `app/components/shared/CommandPalette.tsx`
- optionally new command registry in `lib/commands.ts`

### Acceptance Criteria

- Palette opens/closes reliably.
- Commands execute with same side effects as existing UI paths.
- Search is fast enough for large project/task sets.

### Tests

- Component tests for filtering/selection.
- E2E for opening palette and executing top commands.

---

## WS7. Backup Restore Preview + Validation

### Problem

Restore currently executes immediately after JSON parse and basic shape checks.

### Scope

Add a preview + explicit confirmation flow before mutation.

### Backend

Add `POST /api/backup/validate`:

- Returns summary and warnings without writing.
- Example summary:

```ts
{
  valid: boolean,
  warnings: string[],
  summary: {
    projects: number,
    tasks: number,
    lights: number,
    audioChannels: number,
    schemaVersion?: number
  }
}
```

### Frontend

- Import action becomes:
  1. Parse file
  2. Validate endpoint
  3. Show preview modal
  4. Confirm restore
- Add typed confirm in strict safety mode.

### Touch Points

- `app/components/Dashboard.tsx` (import flow)
- `app/api/backup/restore/route.ts`
- new `app/api/backup/validate/route.ts`
- `lib/client-api.ts`

### Acceptance Criteria

- No restore happens without explicit user confirmation.
- User sees impact summary before applying.
- Invalid backups fail with actionable reason.

### Tests

- API tests for validate route.
- E2E import preview + cancel + confirm.

---

## WS8. SSE Domain-Scoped Events + Incremental Refetch

### Problem

Single `update` event causes full data reloads (`projects + lights + audio`) on every mutation.

### Scope

Introduce event domains and selective fetch to reduce unnecessary load and UI churn.

### Event Evolution

Current:

```json
{ "filter": "all" }
```

Proposed:

```json
{
  "domain": "projects" | "lighting" | "audio" | "settings" | "all",
  "entity": "project" | "task" | "light" | "scene" | "channel" | "snapshot" | "settings",
  "action": "create" | "update" | "delete" | "reorder" | "status",
  "timestamp": "..."
}
```

### Backend

- Emit richer payloads from mutating routes.
- Keep backward-compatible `update` event during transition.

### Frontend

- In `Dashboard.tsx` SSE handler:
  - `projects` event -> fetch projects only
  - `lighting` event -> fetch lighting/scenes only
  - `audio` event -> fetch audio only
  - fallback `all` -> full refresh

### Touch Points

- `app/api/events/route.ts`
- all mutating API routes emitting `eventEmitter.emit("update", payload)`
- `app/components/Dashboard.tsx`

### Acceptance Criteria

- Fewer unnecessary network calls on single-domain edits.
- No stale state regressions.
- Backward compatibility maintained during migration.

### Tests

- Unit/API tests for payload shape.
- E2E verifying domain-specific refresh behavior.

---

## WS9. Accessibility Hardening

### Problem

A11y testing currently excludes color contrast and some controls are hover-only.

### Scope

Raise baseline accessibility quality in live and setup UIs.

### Changes

- Add explicit `aria-label` to icon-only buttons across dashboard subviews.
- Ensure action buttons are keyboard-visible (focus styles + non-hover fallback where needed).
- Re-enable color contrast checks in axe (or document bounded exceptions).
- Add keyboard coverage for modal-close, confirm dialogs, and strip actions.

### Touch Points

- `app/components/kanban/*`
- `app/components/lighting/*`
- `app/components/audio/*`
- `app/components/shared/*`
- `e2e/accessibility.spec.ts`

### Acceptance Criteria

- No critical WCAG A/AA issues for main flows.
- Keyboard users can discover and invoke previously hover-only actions.

### Tests

- Expand axe E2E suite (dashboard, setup, lighting, audio, modals).
- Focus navigation tests.

---

## WS10. Operator Mode

### Problem

Current UI mixes configuration and operation; during live sessions this increases error risk.

### Scope

Create an operator-focused presentation mode optimized for execution, not editing.

### Behavior

- Larger control targets and typography.
- Hide or down-prioritize destructive/config-only controls.
- Keep critical status and current-selection context always visible.
- Quick toggle from header/help/command palette.

### Data/Model

Add setting:

```ts
settings: {
  ...,
  operatorMode: boolean
}
```

### Touch Points

- `lib/types.ts`, `lib/db.ts`, `app/api/settings/route.ts`
- `app/components/Dashboard.tsx`
- `app/components/lighting/LightingView.tsx`
- `app/components/audio/AudioView.tsx`
- CSS utility classes in `app/globals.css`

### Acceptance Criteria

- Operator mode can be toggled without reload.
- Core workflows remain intact.
- Risky edits are harder to trigger in operator mode.

### Tests

- Component tests for mode-conditioned rendering.
- E2E mode toggle + critical actions availability.

---

## 5) Engineering Plan: PR Breakdown

### PR A: Platform Foundations

- Add new settings fields (`safetyMode`, `operatorMode`) + migrations.
- Add `systemApi` and shared types.
- Add feature-flag strategy (if desired).

### PR B: Preflight + Diagnostics

- Implement preflight and diagnostics APIs.
- Add dashboard preflight UI and setup diagnostics UX.

### PR C: Safety Hardening

- Confirm dialog enhancements.
- Strict safety behavior for destructive actions.
- Backup validation route + preview flow.

### PR D: Setup Improvements

- Overlap enforcement and guided corrections.
- Connection validation/UX polish.

### PR E: Context + Command Palette

- Global context strip.
- Command palette with key command set.

### PR F: Realtime + A11y + Operator Mode

- Domain-scoped SSE.
- Accessibility cleanup + expanded tests.
- Operator mode visuals and behavior.

## 6) Suggested Ticket Backlog (Ready to Create)

1. Add `safetyMode` and `operatorMode` to settings schema/migration/API.
2. Implement `/api/system/preflight`.
3. Implement `/api/system/diagnostics`.
4. Build `PreflightGate` and integrate into dashboard bootstrap.
5. Add strict-mode hold-to-confirm in `ConfirmDialog`.
6. Add strict-mode protection for all destructive UI actions.
7. Implement `/api/backup/validate`.
8. Add restore preview modal and confirm flow.
9. Enforce DMX overlap blocking in Setup Wizard.
10. Improve setup connection validation and error messaging.
11. Create global context strip component.
12. Add aggregated context endpoint or extend existing context endpoint.
13. Build command palette shell + keyboard trigger.
14. Register core project/light/audio commands.
15. Add domain payloads to SSE events.
16. Update dashboard fetch strategy for domain-scoped refresh.
17. Add aria labels and keyboard discoverability fixes for icon actions.
18. Re-enable/expand accessibility checks.
19. Implement operator mode styling and control gating.
20. Add E2E coverage for all new high-risk flows.

## 7) Definition of Done (Program Level)

- Critical destructive actions are protected by explicit confirmation pattern(s).
- Operator can verify system readiness before session start.
- Backup restore is previewed and validated before write.
- Setup wizard enforces valid DMX addressing.
- Dashboard updates become domain-scoped without stale UI regressions.
- Accessibility baseline improves and is codified in tests.
- All new behavior is covered by tests and documented in README/CHANGELOG.

## 8) Risks and Mitigations

- **Risk:** Breaking realtime assumptions while changing SSE payloads.
  - **Mitigation:** Keep backward-compatible `update` fallback; migrate in two steps.
- **Risk:** Safety UX slows expert workflows.
  - **Mitigation:** Safety mode is configurable (`normal` vs `strict`).
- **Risk:** Preflight creates startup friction.
  - **Mitigation:** Add bypass window + clear rationale + per-check severity.
- **Risk:** Operator mode fragments UI logic.
  - **Mitigation:** Centralize mode checks and style tokens; avoid deeply branching components.

## 9) Open Decisions (Need Product/Tech Lead Input)

1. Should strict safety mode be default on fresh installs?
2. Should operator mode be global-only or per-view?
3. Should undo for deletion be client-only (fast) or persisted (safer)?
4. Should preflight block only on hard failures, or also on key warnings?
5. Is command palette allowed to trigger destructive commands directly in strict mode?

## 10) Quick Start for Assigned Senior Engineer

1. Read this document and confirm Phase 1 scope.
2. Start with PR A (settings + schema + API compatibility).
3. Implement PR B and PR C in parallel if staffing allows.
4. Add/expand tests before merging each PR.
5. Release behind defaults (`normal` safety, preflight optional), then tighten defaults after bake-in.
