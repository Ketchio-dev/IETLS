# IELTS Academic MVP Docs

This repo started from a clean baseline on **March 26, 2026**. These docs now serve two purposes:

1. preserve the original review contracts that shaped the first implementation slices, and
2. document the currently implemented task-aware practice-shell + dashboard workflow.

## Included docs

- `docs/review/mvp-foundation-review.md` — scope, route/file boundaries, domain model, service seams, and quality risks for the original Writing Task 2 MVP.
- `docs/review/verification-lane.md` — expected command contract, smoke-test path, and merge-readiness checks for the current task-aware shell + dashboard flow.
- `docs/review/writing-task-2-next-slice-review.md` — architecture contract, review guardrails, and documentation checklist for the scorer-adapter/range-reporting/history-summary upgrade.
- `docs/review/writing-task-2-next-slice-contracts.md` — concrete data-contract examples for scorer output, normalized reports, and progress-history trend summaries.
- `docs/review/writing-task-1-academic-next-slice-review.md` — review guardrails that shaped the move from a Task 2-only flow into a task-aware Task 1 + Task 2 experience.
- `docs/review/writing-task-1-academic-next-slice-contracts.md` — concrete Task 1 prompt, scoring, report, and persistence contracts for that expansion.
- `docs/review/writing-dashboard-recent-attempts-review.md` — review/documentation note for the dashboard-side recent saved-attempt inspection and quick resume links back into the practice shell.
- `docs/review/writing-dashboard-criterion-trends-review.md` — review/documentation note for the implemented dashboard slice: criterion-trend summaries, saved-attempt compare support, and stronger persisted study-plan presentation on `/dashboard`.
- `docs/review/writing-application-service-boundary-review.md` — review/documentation note for the route/page refactor that moves writing-shell and dashboard orchestration behind a narrow server-side application-service boundary.

## Current review snapshot

- The runnable app now supports **Writing Task 1 Academic** and **Writing Task 2** inside one practice shell.
- Saved attempts are persisted locally and reused by both the shell and the dashboard.
- The dashboard summarizes recent saved attempts, scorer usage, task coverage, criterion trends, and a lightweight-but-actionable study plan without adding dependencies.
- The dashboard now supports saved-attempt comparison and stronger study-plan presentation while preserving the same persistence-first resume flow.
- Route/page orchestration is being documented around a narrow writing application-service boundary so Next.js entrypoints can stay thin as the MVP grows.
- The live scorer path still defaults to **Gemini 3 Flash** when OpenRouter is enabled, while the mock scorer remains the deterministic fallback.
- Older `next-slice` review notes are still worth keeping because they explain the design guardrails behind the current implementation.
