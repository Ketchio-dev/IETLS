# Assessment-Module Registry / Workspace Boundary Review

_Date: March 26, 2026_

This review note documents the next IELTS platform foundation slice: extract a shared assessment-module registry and workspace boundary so the app is no longer structurally writing-only. The slice should preserve the current Writing Task 1 / Task 2 routes, dashboard, APIs, Gemini 3 Flash default scoring path, file-backed persistence, and learner-facing UX while making the first writing module look like one entry in a broader platform seam.

## Outcome this slice should deliver

The merged branch stays healthy when it:

1. keeps `/`, `/dashboard`, `GET /api/writing/task`, and `POST /api/writing/assessment` working exactly as they do now,
2. introduces one shared registry that describes available assessment modules while registering writing as the first concrete module,
3. extracts a narrow workspace boundary that lets routes and APIs delegate to a module instead of importing writing-only orchestration directly,
4. preserves the current Writing Task 1 / Task 2 prompt bank, dashboard summaries, persistence history, and compare/resume behavior,
5. keeps Gemini 3 Flash as the default live scorer when OpenRouter is enabled,
6. avoids new dependencies, route churn, or a broad domain-model rewrite.

## Current baseline findings

The current codebase already has useful seams, but the top-level assessment surface is still effectively an alias for writing:

- `src/lib/services/assessment.ts` is a writing-only facade that re-exports `src/lib/services/writing/assessment-pipeline.ts`.
- `src/app/page.tsx`, `src/app/dashboard/page.tsx`, and `src/app/api/writing/*` all import writing-specific application-service helpers directly.
- `src/lib/services/writing/application-service.ts` is a good orchestration seam, but its callers have no module registry above it yet.
- `src/lib/server/writing-assessment-repository.ts` is already the stable persistence boundary for prompts, saved assessments, and dashboard study-plan state.
- `src/components/writing/*` already behaves like one workspace family, so the next slice should extract a boundary around it rather than redesign the UX.

Those findings suggest the right move is not a full generic rewrite. The safer move is to introduce a shared registry + workspace contract above the existing writing module so the platform can grow without destabilizing the live writing flow.

## Recommended implementation seam

Keep the change narrow and additive.

### Registry boundary

Add one shared registry module that can answer questions such as:

- which assessment modules exist,
- which module owns a given route or API surface,
- which server-side loader/submission handlers belong to that module,
- which workspace metadata the UI should use for titles, labels, and navigation.

For this slice, the registry only needs one concrete entry: the writing module.

### Workspace boundary

Extract a module-facing workspace contract that sits above writing-specific orchestration and below route/UI entrypoints. A good boundary should:

- let pages and APIs resolve one module and call normalized loaders/submit handlers,
- keep writing-specific prompt seeding, scoring, dashboard aggregation, and persistence inside the writing module,
- avoid pushing rubric logic, repository details, or dashboard math into the registry layer,
- preserve current writing routes instead of forcing a new module-id URL shape.

### Keep existing writing seams intact

The existing writing module should still own:

- prompt fixtures and prompt-bank seeding,
- assessment scoring/evidence/feedback composition,
- dashboard summary and progress/study-plan assembly,
- file-backed persistence through the existing repository/storage port.

That keeps the registry thin and prevents the platform seam from becoming a second place where writing rules are reimplemented.

## Code-quality review notes

This slice stays maintainable when it preserves five boundaries:

- **Registry stays declarative.** It should map module ids to handlers/metadata, not reimplement writing logic.
- **Workspace loaders stay normalized.** Routes and APIs should talk to one module-facing contract instead of importing writing-only helpers ad hoc.
- **Persistence stays centralized.** The writing repository remains the layer that knows how prompts, assessments, and study-plan snapshots are stored on disk.
- **Writing behavior stays stable.** Task 1 / Task 2 flows, compare/resume behavior, and saved-attempt history should not change as a side effect of adding a module registry.
- **Generic extraction stays incremental.** Do not widen every writing-specific domain type unless the registry boundary truly needs it.

## Guardrails for future edits

- Do not rename or move the current writing routes just to make the platform seam feel more generic.
- Do not replace the existing writing repository with a new shared persistence abstraction unless the current file-backed behavior remains untouched.
- Do not move Gemini 3 Flash away from the default live scorer.
- Do not collapse Task 1 / Task 2 history into a module-agnostic summary that loses current writing semantics.
- Do not force UI components to become generic before a second assessment module actually exists.
- Do not introduce new dependencies, plugin loaders, or dynamic runtime discovery for the first registry slice.

## Focused verification expectations

Relevant automated coverage for this slice should include:

- focused tests for the new registry/workspace boundary so writing resolves through the shared module contract,
- page and API tests that prove the current writing routes still delegate correctly after the extraction,
- existing writing application-service, repository, and dashboard tests to confirm compare/resume and persistence behavior remain unchanged,
- scorer-adapter coverage confirming Gemini 3 Flash remains the default OpenRouter model.

Before merge, reviewers should also confirm `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass on the branch.

## Reviewer checklist

- [ ] Writing is registered through one shared assessment-module registry.
- [ ] Routes and APIs resolve writing through a shared workspace boundary instead of importing writing-only orchestration directly.
- [ ] Current Writing Task 1 / Task 2 routes and dashboard behavior remain unchanged.
- [ ] File-backed persistence and saved-attempt compare/resume behavior remain unchanged.
- [ ] Gemini 3 Flash remains the default live scorer when OpenRouter is enabled.
- [ ] No new dependency or broad domain-model rewrite was added.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
