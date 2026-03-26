# Writing Dashboard Criterion Trends + Compare Review

_Date: March 26, 2026_

This review note captures the next `/dashboard` slice for the IELTS Academic Writing MVP: add compact criterion-trend summaries plus saved-attempt compare support without changing the existing Task 1 / Task 2 scoring or resume workflow.

## Outcome this slice should deliver

The merged branch should:

1. reuse the existing local persistence layer for saved attempts and saved assessments,
2. surface compact criterion trend summaries derived from persisted history,
3. let learners compare two saved attempts from `/dashboard` without opening a second storage path,
4. keep the current practice-shell resume flow unchanged,
5. preserve Gemini 3 Flash as the default live scorer when OpenRouter is enabled,
6. avoid new dependencies, charting libraries, or dashboard-only stores.

## Current baseline findings

The current dashboard already provides aggregated metrics, strongest/weakest criterion snapshots, scorer usage, recent saved-attempt inspection, and a lightweight study plan. The main gap for this next slice is that learners still cannot:

- see whether an individual criterion is improving, flat, or slipping over recent saved attempts,
- compare two saved attempts side by side from the dashboard,
- trace score movement without manually opening each report.

Those gaps are good extension points because the repo already has the right seams: `src/lib/server/writing-assessment-repository.ts` persists the needed data, `src/lib/services/writing/dashboard.ts` owns dashboard aggregation, and `src/components/writing/writing-dashboard.tsx` is the right place to render normalized dashboard models rather than recomputing compare logic inline.

## Recommended implementation seam

Keep the new work inside the existing dashboard boundary:

- `src/lib/services/writing/dashboard.ts` should derive criterion trend summaries and any compare-ready view model from persisted saved assessments.
- `src/app/dashboard/page.tsx` should keep wiring repository data into normalized service outputs rather than hand-assembling compare state in the route.
- `src/components/writing/writing-dashboard.tsx` should render compare/trend UI from normalized inputs and keep presentation thin.
- `src/components/dashboard/dashboard-recent-attempts-panel.tsx` can keep owning selection/resume interactions, but compare-specific scoring math should stay out of the component tree.

## Code-quality review notes

This slice stays healthy when it preserves four boundaries:

- **Persistence stays centralized.** Reuse saved attempts and saved assessments from the existing repository layer.
- **Comparison logic stays normalized.** Compute score deltas, criterion movement, and compare labels in service helpers rather than JSX branches.
- **Resume navigation stays unchanged.** Comparing attempts on `/dashboard` must not fork a new editing flow or alter the existing resume query params.
- **Dashboard copy stays coaching-oriented.** Trend and compare language should describe directional practice signals, not official IELTS precision.

## Guardrails for future edits

- Do not change Task 1 / Task 2 scoring behavior as part of dashboard-only work.
- Do not move the default live scorer away from Gemini 3 Flash.
- Do not introduce a new persistence store, analytics pipeline, or chart dependency for compare/trend UI.
- Do not let compare mode bypass the saved-attempt resume path back into `/`.
- Do not recompute criterion deltas directly inside React components when shared service helpers can provide the model once.

## Focused verification expectations

Relevant automated coverage for this slice should include:

- `src/lib/services/writing/__tests__/dashboard.test.ts` for criterion trend summaries, compare deltas, and task-aware history handling.
- `src/components/writing/__tests__/writing-dashboard.test.tsx` for compare UI, criterion trend copy, and unchanged return-to-practice-shell behavior.
- `src/components/writing/__tests__/writing-practice-shell.test.ts` to confirm dashboard-triggered resume links still hydrate the same prompt/attempt flow.
- `src/lib/server/__tests__/writing-assessment-repository.test.ts` for persisted history reads that power dashboard compare inputs.

Before merge, reviewers should also confirm `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass on the branch.

## Reviewer checklist

- [ ] Criterion trend summaries come from persisted saved-attempt history rather than ad-hoc UI state.
- [ ] Dashboard compare support is limited to saved attempts already in local persistence.
- [ ] Practice-shell resume links still work exactly as before.
- [ ] Task 1 / Task 2 scoring behavior remains unchanged.
- [ ] Gemini 3 Flash remains the default live-scorer model.
- [ ] No external dependency was added for this slice.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
