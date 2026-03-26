# Verification Lane Contract

_Date: March 26, 2026_

This document defines the minimum runnable-command contract the implementation branches should satisfy before merge.

## Expected package scripts

The repo should expose these commands once the Next.js app lands:

- `npm run dev` — local development server.
- `npm run lint` — lint the app and docs-adjacent source files.
- `npm run typecheck` — TypeScript verification (`tsc --noEmit` or equivalent).
- `npm run test` — unit/integration suite.
- `npm run test:e2e` _(optional for first merge, recommended next)_ — browser smoke path.

If a different package manager is chosen, keep the **script names** stable.

## Minimum smoke path

A reviewer should be able to verify the current slice by:

1. launching the app,
2. opening the writing practice route,
3. selecting **Writing Task 2** and confirming an existing Task 2 prompt fixture still loads,
4. typing into the editor while the timer counts down,
5. submitting the response,
6. opening a mock assessment report,
7. confirming overall band, criterion bands, evidence, feedback, and history render.

For the Task 1 Academic extension branch, add this smoke path before merge:

1. switch from **Writing Task 2** to **Writing Task 1**,
2. confirm the prompt bank changes to Task 1 fixtures only,
3. submit a Task 1 response,
4. confirm the report uses Task 1-appropriate rubric wording,
5. confirm saved history remains scoped to the active task family.

## Suggested merge checklist

- App boots from a documented install command.
- Prompt/session/report fixtures are checked into the repo.
- API/service scaffolding is mockable and does not require external credentials.
- Lint passes.
- Typecheck passes.
- Tests cover the prompt → session → report path.
- No dead placeholder routes or broken navigation remain.

## Documentation contract

Before the first integration branch is declared complete, the repo should include:

- one quick-start section,
- one architecture note covering scoring/evidence/feedback seams,
- one verification section listing the commands above,
- one statement about fixture-driven development versus live AI scoring.

## Current status note

At the time this review doc was added, the repo baseline did **not yet** contain the application scaffold or package scripts. This file is therefore a forward contract for incoming implementation work rather than a claim that the commands already exist.
