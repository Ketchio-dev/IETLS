# IELTS Academic MVP Docs

This repo started from a clean baseline on **March 26, 2026**. These docs define the first vertical-slice contract so implementation, testing, and review can converge without guessing.

## Included docs

- `docs/review/mvp-foundation-review.md` — scope, route/file boundaries, domain model, service seams, and quality risks for the Writing Task 2 MVP.
- `docs/review/verification-lane.md` — expected command contract, smoke-test path, and merge-readiness checks.
- `docs/review/writing-task-2-next-slice-review.md` — architecture contract, review guardrails, and documentation checklist for the scorer-adapter/range-reporting/history-summary upgrade.
- `docs/review/writing-task-2-next-slice-contracts.md` — concrete data-contract examples for scorer output, normalized reports, and progress-history trend summaries.
- `docs/review/writing-task-1-academic-next-slice-review.md` — review guardrails for expanding the app from a Task 2-only flow into a task-aware Task 1 + Task 2 experience.
- `docs/review/writing-task-1-academic-next-slice-contracts.md` — concrete Task 1 prompt, scoring, report, and persistence contracts for the next implementation slice.

## Current review snapshot

- Baseline branch content was effectively empty when this review pass started.
- The docs below intentionally avoid touching shared product code so implementation workers can merge independently.
- Treat these docs as the initial contract for the first runnable vertical slice.
- The new next-slice review notes capture how to extend the MVP without breaking the local mock-first workflow.
- The Task 1 Academic review set now records the main baseline constraint: the current codebase is still Task-2-only in domain types, fixtures, scoring instructions, UI copy, and shared history storage.
