# Writing Dashboard Recent Attempts Review

_Date: March 26, 2026_

This review note documents the dashboard-side slice that turns persisted writing attempts into a lightweight revision workflow. The goal is to let learners inspect recent saved attempts from the dashboard and jump back into the practice shell without changing the existing Task 1 / Task 2 scoring paths.

## Outcome this slice should deliver

The merged branch should:

1. reuse the existing local persistence layer for saved writing attempts,
2. surface a dashboard summary that reflects recent saved-attempt history,
3. keep quick navigation between the dashboard and the practice shell,
4. preserve current scoring behavior for both Task 1 and Task 2,
5. keep Gemini 3 Flash as the default live scorer when OpenRouter is enabled,
6. avoid new dependencies.

## Scope delivered by the current implementation

The current implementation meets that scope through these seams:

- `src/app/dashboard/page.tsx` reads persisted prompts, recent attempts, and saved assessments from the server repository.
- `src/components/writing/writing-dashboard.tsx` renders aggregated metrics, scorer usage, strongest/weakest criterion summaries, study-plan guidance, and the quick return link back to `/`.
- `src/components/writing/writing-practice-shell.tsx` keeps the dashboard entry link visible while still allowing prompt switching and saved-attempt inspection inside the shell.
- `src/lib/server/writing-assessment-repository.ts` remains the shared persistence boundary for prompts, saved assessments, recent attempts, and dashboard study-plan state.
- `src/lib/services/writing/dashboard.ts` and `src/lib/services/writing/progress-summary.ts` transform persisted attempts into review-friendly summary data without moving business logic into routes or components.

## Code-quality review notes

This slice is in good shape when it preserves three boundaries:

- **Persistence stays centralized.** The dashboard and practice shell should keep reading shared attempt data from the repository rather than duplicating storage logic inside UI routes.
- **Presentation stays thin.** Components should render dashboard metrics and resume links from normalized summary models, not recompute aggregation rules inline.
- **Resume navigation stays lightweight.** The dashboard should link back into the practice shell rather than creating a second editing workflow.

A small cleanup pass has already reduced duplicated dashboard presentation logic after the feature landed; further cleanup should continue to prefer shared helpers over route-local duplication.

## Guardrails for future edits

- Do not change Task 1 / Task 2 scoring behavior as part of dashboard-only work.
- Do not move the default live scorer away from Gemini 3 Flash.
- Do not introduce a new persistence store just for dashboard data.
- Do not add analytics-heavy UI or charting dependencies for this slice.
- Do not let dashboard summaries imply official IELTS scoring precision; they remain coaching signals built from saved practice attempts.

## Focused verification expectations

Relevant automated coverage for this slice should continue to include:

- `src/components/writing/__tests__/writing-practice-shell.test.ts` for dashboard entry links, task switching, and saved-attempt updates after submission.
- `src/components/writing/__tests__/writing-dashboard.test.tsx` for dashboard rendering and the return-to-practice-shell link.
- `src/lib/services/writing/__tests__/dashboard.test.ts` for aggregated metrics and study-plan generation.
- `src/lib/server/__tests__/writing-assessment-repository.test.ts` for local persistence and list/read behavior.

Before merge, reviewers should also confirm `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass on the branch.

## Reviewer checklist

- [ ] Dashboard data is sourced from persisted saved attempts rather than ad-hoc UI state.
- [ ] Practice shell still supports Task 1 / Task 2 switching and saved-attempt inspection.
- [ ] Dashboard link and return link both navigate correctly.
- [ ] Task 1 / Task 2 scoring behavior remains unchanged.
- [ ] Gemini 3 Flash remains the default live-scorer model.
- [ ] No external dependency was added for this slice.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
