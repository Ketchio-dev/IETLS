# Writing Application-Service Boundary Review

_Date: March 26, 2026_

This review note documents the route/page refactor that keeps Next.js entrypoints thin by moving writing-specific orchestration behind a narrow server-side application-service boundary. The goal is to preserve the current Task 1 / Task 2, dashboard compare/resume, study-plan caching, and Gemini 3 Flash scoring behavior while stopping pages from composing repository seeding, persistence reads, and dashboard assembly inline.

## Outcome this slice should deliver

The refactor stays healthy when the merged branch:

1. keeps `src/app/page.tsx` focused on request/search-param handling plus rendering,
2. keeps `src/app/dashboard/page.tsx` focused on loading one normalized dashboard payload and rendering it,
3. moves prompt seeding, prompt lookup, saved-attempt loading, and dashboard-study-plan loading behind one server-side writing application service,
4. preserves the existing persisted dashboard resume flow and saved-attempt compare support,
5. keeps study-plan caching behavior tied to the latest saved assessment snapshot rather than page-local state,
6. leaves Gemini 3 Flash as the default live scorer when OpenRouter is enabled,
7. avoids new dependencies, duplicate repositories, or route-local view-model assembly.

## Recommended implementation seam

Keep the refactor inside a narrow server-only boundary:

- a writing application-service module under `src/lib/server/` should own prompt seeding plus the read models needed by the practice shell and dashboard,
- `src/app/page.tsx` should call that boundary once to resolve prompt bank, recent history, saved assessments, and resume-target hydration,
- `src/app/dashboard/page.tsx` should call that boundary once to resolve prompts, recent saved attempts, summary inputs, progress inputs, and the cached study plan,
- the repository layer should stay responsible for persistence details and study-plan cache invalidation rules,
- `src/lib/services/writing/dashboard.ts` and `src/lib/services/writing/progress-summary.ts` should keep owning aggregation logic rather than pushing it into routes.

A good boundary is narrow enough that route files read like parameter parsing plus component wiring, but not so broad that it swallows scoring, dashboard aggregation, or persistence internals that already have a home.

## Code-quality review notes

This slice stays maintainable when it preserves five boundaries:

- **Routes stay thin.** Next.js pages should not manually seed prompts, sort persisted records, or reconstruct resume-selection logic more than once.
- **Persistence stays centralized.** The repository remains the only layer that knows how prompts, assessments, and the cached study plan are stored.
- **Application services orchestrate, not recalculate.** The new boundary should compose existing repository and domain-service helpers instead of re-implementing dashboard math.
- **Resume and compare behavior stay stable.** The application-service refactor must keep the same prompt-selection, attempt-selection, and dashboard compare/resume outcomes.
- **Scoring defaults stay untouched.** Refactoring route/page composition must not alter provider selection or move the default scorer away from Gemini 3 Flash.

## Guardrails for future edits

- Do not move repository read/write details into Next.js pages just because the wiring feels short.
- Do not introduce a second cache or dashboard-only persistence path for study-plan data.
- Do not duplicate dashboard summary or progress-summary logic inside the new application service.
- Do not change Task 1 / Task 2 scoring behavior as part of route/page cleanup.
- Do not move the default live scorer away from Gemini 3 Flash.
- Do not let resume/query-param hydration drift between the practice shell and dashboard flows.

## Focused verification expectations

Relevant automated coverage for this slice should include:

- focused tests for any new writing application-service module under `src/lib/server/__tests__/`, especially prompt seeding, resume-target hydration, and dashboard payload loading,
- `src/lib/server/__tests__/writing-assessment-repository.test.ts` for persisted history and study-plan cache reuse,
- `src/lib/services/writing/__tests__/dashboard.test.ts` for dashboard aggregation and compare behavior,
- `src/components/writing/__tests__/writing-practice-shell.test.ts` for unchanged prompt switching and dashboard resume hydration,
- `src/components/writing/__tests__/writing-dashboard.test.tsx` for unchanged compare/resume behavior from `/dashboard`.

Before merge, reviewers should also confirm `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass on the branch.

## Reviewer checklist

- [ ] Next.js page files are thinner and rely on a writing application-service boundary for data orchestration.
- [ ] Repository seeding, persistence reads, and study-plan cache reuse are no longer composed directly inside routes/pages.
- [ ] Dashboard compare/resume behavior remains unchanged.
- [ ] Study-plan caching still reuses the latest saved-assessment snapshot rules.
- [ ] Task 1 / Task 2 scoring behavior remains unchanged.
- [ ] Gemini 3 Flash remains the default live-scorer model.
- [ ] No new dependency or duplicate persistence layer was added.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
