# Verification Lane Contract

_Date: March 26, 2026_

This document defines the runnable-command and smoke-test contract the current implementation should satisfy before merge.

## Expected package scripts

The repo should expose these commands:

- `npm run dev` — local development server.
- `npm run lint` — lint the app and docs-adjacent source files.
- `npm run typecheck` — TypeScript verification (`tsc --noEmit`).
- `npm run test` — unit/integration suite.
- `npm run test:e2e` _(optional for this MVP, recommended next)_ — browser smoke path.

If a different package manager is chosen, keep the **script names** stable.

## Minimum smoke path

A reviewer should be able to verify the current slice by:

1. launching the app,
2. opening the writing practice route,
3. confirming **Writing Task 2** still loads an existing Task 2 prompt fixture,
4. switching to **Writing Task 1** and confirming the prompt bank changes to Task 1 fixtures only,
5. typing into the editor while the timer counts down,
6. submitting the response,
7. confirming the saved report shows overall band, criterion bands, evidence, feedback, and scorer metadata,
8. inspecting the saved-attempt list for the active prompt inside the practice shell,
9. opening `/dashboard`,
10. confirming the dashboard shows recent saved-attempt metrics, scorer usage, and study-plan guidance,
11. using the dashboard return link to go back to the practice shell without losing the ability to inspect saved reports,
12. confirming Task 1 / Task 2 scoring behavior remains stable and the live scorer still defaults to Gemini 3 Flash when enabled.

## Suggested merge checklist

- App boots from a documented install command.
- Prompt/session/report fixtures are checked into the repo.
- API/service scaffolding is mockable and does not require external credentials.
- Practice-shell navigation and dashboard navigation both work.
- Saved attempts remain locally persisted and reusable across shell/dashboard views.
- Lint passes.
- Typecheck passes.
- Tests cover prompt → session → report → saved-attempt inspection flows.
- No dead placeholder routes or broken navigation remain.

## Documentation contract

Before the current integration branch is declared complete, the repo should include:

- one quick-start section,
- one architecture note covering scoring/evidence/feedback seams,
- one verification section listing the commands above,
- one statement about fixture-driven development versus live AI scoring,
- one documentation note covering the persisted dashboard/resume loop.

## Current status note

The current repo contains the application scaffold, package scripts, task-aware prompt fixtures, local persistence, and the dashboard route. This file is therefore an active verification contract for the implemented MVP rather than a forward-looking placeholder.
