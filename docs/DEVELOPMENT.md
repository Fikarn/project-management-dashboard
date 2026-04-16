# Development

## Goal

This project should be developed as a production-grade local studio console, not as a casual prototype.

That means every change should aim for:

- operator reliability
- maintainable code structure
- clear UI behavior
- test coverage for meaningful risk
- disciplined Git history

## Project Priorities

When deciding what matters most, use this order:

1. Studio operations stability
2. Lighting, audio, and control-surface workflows
3. Data safety and recovery
4. UI clarity under pressure
5. Production planning features

If a change improves planning but risks studio reliability, studio reliability wins.

## Recommended Daily Workflow

### 1. Start from a clean base

Before doing any work:

```bash
git switch main
git pull origin main
npm install
```

If you are starting a real feature or fix:

```bash
git switch -c feature-short-description
```

Use short branch names such as:

- `feature-lighting-scenes`
- `fix-audio-meter-polling`
- `chore-release-workflow`

### 2. Launch the app

For browser-only work:

```bash
npm run dev
```

For desktop-app behavior:

```bash
npm run electron:dev
```

Use the Electron app whenever the change touches:

- `electron/*`
- startup or shutdown behavior
- tray or dock behavior
- splash/loading behavior
- DMX or OSC lifecycle behavior

For native architecture work:

```bash
npm run native:check
npm run native:test
npm run native:build
npm run native:package:mac:local
npm run native:package:mac:smoke
npm run native:package:mac:clean-smoke
npm run native:package:win:local
npm run native:package:win:smoke
npm run native:package:win:clean-smoke
npm run native:release:mac:local
npm run native:release:win:local
npm run native:smoke
npm run native:smoke:clean-start
npm run native:smoke:bundled-engine
npm run native:smoke:lifecycle
npm run native:smoke:failures
npm run native:acceptance
```

`npm run native:build` compiles the Rust engine and the Qt shell. On macOS, it auto-detects common Homebrew Qt prefixes. On Windows or custom Qt installs, set `CMAKE_PREFIX_PATH`, `QT_ROOT_DIR`, `QTDIR`, `QT_DIR`, or `Qt6_DIR` if Qt is not discovered automatically.

For native startup, lifecycle, and failure coverage:

```bash
npm run native:smoke:clean-start
npm run native:smoke:lifecycle
npm run native:smoke:protocol-mismatch
npm run native:smoke:runtime-dir-failure
npm run native:smoke:corrupt-storage
npm run native:smoke:watchdog-timeout
```

### 3. Ask Codex to inspect first

At the start of a session, do not jump straight to implementation. Ask Codex to:

- inspect the relevant files
- explain the current behavior
- identify risks
- propose a plan

Good example:

> Inspect the lighting scene flow first. Explain how it currently works, identify problems, and propose the safest implementation plan before changing code.

### 4. Implement in small batches

Avoid large vague requests like:

> Improve the app.

Prefer:

> Refactor the lighting scene save/recall flow. Keep behavior the same unless needed for correctness. Run the relevant tests afterward and summarize the result.

For bigger tasks, break them into batches:

1. analysis and plan
2. first implementation slice
3. validation
4. follow-up polish

### 5. Run the right level of validation

Do not run every possible command for every small CSS tweak. Match the checks to the risk.

#### Small UI-only changes

```bash
npm run lint
npm run build
```

#### API, state, or logic changes

```bash
npm run lint
npm test
npm run build
```

#### Changes affecting operator flows

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

#### Changes affecting Electron or packaging

```bash
npm run lint
npm test
npm run build
npm run electron:build
```

#### Release preparation

```bash
npm run release:verify
```

## How To Work Effectively With Codex

### Session Template

Use this pattern in future sessions:

> I’m working on `<goal>`. First inspect the relevant code and explain the current behavior. Then propose a short plan. After I approve it, implement in small steps, run the right validation commands, and summarize what changed.

This gives you four useful things:

1. context building
2. a review point before code changes
3. implementation discipline
4. explicit validation

### Good Prompt Patterns

### For a bug

> Investigate why `<bug>` happens. Reproduce it from the code, identify root cause, fix it with the smallest safe change, and run the right tests.

### For a feature

> Add `<feature>`. Inspect the existing architecture first and follow existing patterns. Keep the code modular and production-ready. Run validation after implementation.

### For refactoring

> Refactor `<file or feature>` into smaller modules without changing behavior unless necessary for correctness. Explain the resulting structure and run the right tests.

### For design/polish

> Improve the visual design of `<screen>`. Keep the existing product language, avoid generic UI, and preserve operator clarity. Implement directly and show what changed.

### For code review

> Review these changes like a senior engineer. Focus on bugs, regressions, missing tests, and operational risk. Findings first.

### What To Tell Codex Explicitly

Codex works best when you state:

- the goal
- the constraint
- what not to break
- whether behavior should stay the same
- what validation to run

Example:

> Add group-level lighting scene recall. Do not break existing per-light recall behavior. Follow current API/client patterns. Run lint, tests, and build afterward.

### What To Avoid

Avoid prompts that are:

- too broad
- ambiguous about scope
- missing constraints
- asking for code before understanding

Bad example:

> Make the lighting system better.

Better:

> Inspect the lighting sidebar and scene flow. Improve scene usability for a live operator, but do not change DMX behavior. Keep the implementation modular and run tests.

## Recommended Development Rules

### 1. Always preserve working software

Prefer incremental change over rewrites.

### 2. Follow existing domain boundaries

Keep changes in the correct layer:

- `app/components/...` for UI
- `app/api/...` for route handlers
- `lib/...` for shared domain logic and client adapters
- `electron/...` for desktop lifecycle
- `docs/...` for process and operator documentation

### 3. Validate write paths carefully

If a change mutates state:

- validate input
- handle errors clearly
- add or update tests

### 4. Protect operator workflows

Anything that touches:

- light output
- audio control
- startup
- shutdown
- backups
- setup/commissioning

should be treated as high risk and tested more carefully.

### 5. Keep files modular

If a file starts becoming hard to read, split it before it becomes a problem.

### 6. Update docs when behavior changes

Update documentation when you change:

- release flow
- startup/shutdown behavior
- setup steps
- operator recovery paths
- architecture patterns

## Definition Of Done

A change is done when:

- the code works
- the code is understandable
- the right tests pass
- the UI is coherent
- the docs are updated if needed
- Git history is clean

## Git Workflow

### Normal feature work

```bash
git switch main
git pull origin main
git switch -c feature-short-description
```

Work with Codex, then:

```bash
git status
git add -A
git commit -m "feat: short description"
git push -u origin feature-short-description
```

If you want a PR, open one before merging.

### Recommended commit types

- `feat:` new capability
- `fix:` bug fix
- `refactor:` structure change without feature change
- `docs:` documentation only
- `chore:` tooling, workflow, housekeeping
- `release:` version prep

## Testing Strategy

### Use unit/API tests for:

- route validation
- persistence behavior
- domain logic
- regression coverage

### Use E2E tests for:

- operator flows
- setup flow
- modal flows
- keyboard interactions
- cross-view behavior

### Use Electron builds for:

- startup/runtime changes
- packaging changes
- splash/tray/dock changes
- local server runtime changes

## Release Workflow

Release details live in [docs/RELEASE.md](/Users/EdvinLandvik/Projects/EdvinProjectManager/docs/RELEASE.md), but the short version is:

1. bump version
2. update changelog
3. run `npm run release:verify`
4. commit release prep
5. push `main`
6. create and push tag
7. let GitHub Actions build the release

## Best Way To Use Codex In Future Sessions

Use Codex as:

- a codebase analyst
- an implementation worker
- a reviewer
- a release assistant

A strong default session looks like this:

1. Ask Codex to inspect the relevant area first.
2. Ask for a short plan.
3. Approve the plan.
4. Ask Codex to implement.
5. Ask Codex to run validation.
6. Ask Codex to summarize what changed and any remaining risk.

If the task is large, explicitly ask for checkpoints.

Example:

> Handle this in batches. After each batch, stop, summarize the result, and tell me the next safest step.

## If You Feel Unsure

If you do not understand a proposed change, ask Codex:

- to explain the current code first
- to explain the diff in plain language
- to describe tradeoffs
- to give the safest option, not the fanciest one

Good beginner-safe prompt:

> Explain this as if I’m new to software development. Show me what changed, why it changed, and what I should watch out for next time.
