# Writing Task 1 Academic Next Slice Review

_Date: March 26, 2026_

This review note documents the next production-facing slice for extending the current IELTS Academic Writing MVP from a Task 2-only flow into a task-aware Writing Task 1 + Task 2 practice surface. It is written to keep implementation, testing, and merge review aligned while preserving the existing local-first workflow.

## Outcome this slice should deliver

The merged branch should add **Writing Task 1 Academic** support without regressing the current Task 2 experience.

That means the slice should:

1. let the learner switch between Task 1 and Task 2 before choosing a prompt,
2. add structured chart-driven Task 1 prompts rather than reusing Task 2 prose-only prompt fields,
3. score Task 1 through a separate evidence/rubric path that reflects Task 1 expectations,
4. keep persistence/history task-aware so Task 1 attempts do not pollute Task 2 trends,
5. preserve Gemini 3 Flash as the default live-scorer model when OpenRouter is enabled,
6. avoid new dependencies and keep the diff reviewable.

## Current baseline findings

The current baseline is a solid Task 2 MVP, but several seams are still hard-coded to Task 2 and should be treated as review targets for this slice:

- `src/lib/domain.ts` narrows `WritingTaskType` to `'task-2'`, so the domain cannot yet represent Task 1.
- `src/lib/fixtures/writing.ts` seeds only Task 2 prompts and sample responses.
- `src/app/page.tsx` and `src/app/api/writing/task/route.ts` expose one undifferentiated prompt bank rather than a task-family switch.
- `src/components/writing/writing-practice-shell.tsx` hard-codes Task 2 labels, placeholder text, and prompt-selection copy.
- `src/lib/services/writing/scorer-adapter.ts` uses a Task 2 rubric version and Task 2-specific scorer instructions.
- `src/lib/server/writing-assessment-repository.ts` persists shared recent-attempt history without a task-family partition, which would mix incomparable Task 1 and Task 2 trends.

These are good extension points because the app already has stable seams for prompts, scoring, reporting, and history; the work now is to widen those seams without collapsing Task 1 and Task 2 into one indistinct flow.

## Architecture contract

Keep the task-family split explicit all the way through the app.

### Recommended seam updates

- represent prompts as a discriminated task-family model rather than a single Task 2 shape,
- choose `taskType` before prompt selection so the UI never shows Task 1 and Task 2 prompts in the same undifferentiated list,
- keep the scorer behind one provider boundary, but branch to task-specific evidence/rubric builders before provider normalization,
- normalize Task 1 and Task 2 results back into one app-facing report shape wherever practical,
- persist task metadata on saved attempts and trend summaries so history filtering remains deterministic.

### Review guardrails

- Do not weaken the existing Task 2 path just to fit Task 1 into the current shape.
- Do not route Task 1 through Task 2-specific rubric wording such as `Task Response`.
- Do not let UI copy imply that Task 1 and Task 2 histories are interchangeable.
- Do not change the live-scorer default away from Gemini 3 Flash.
- Do not add chart-rendering or analytics dependencies for the first Task 1 slice.

## Task 1 prompt-model guidance

Task 1 needs a more structured prompt contract than Task 2.

A practical Task 1 prompt should describe:

- the chart type (`line`, `bar`, `table`, `pie`, `process`, `map`),
- the measurement context and units,
- the key data series/categories,
- the time period when relevant,
- the learner instruction text,
- planning hints focused on overview + key feature selection.

For this slice, keep the prompt representation text-first and fixture-friendly. The learner should be able to understand the prompt from structured text even if a richer visual rendering is deferred.

## Task 1 evidence + scoring guidance

Task 1 should follow a separate evidence path because the writing target differs materially from Task 2.

Evidence extraction should favor signals such as:

- presence of a clear overview,
- selection of the most important trends/features,
- valid comparisons between categories/time periods,
- cautious use of data references rather than invented precision,
- logical grouping of information.

Scoring/rubric notes should reflect Task 1 wording (`Task Achievement`) instead of Task 2 wording (`Task Response`). The rest of the rubric family can remain aligned where the public IELTS criteria overlap.

## Persistence + history guidance

Task-aware persistence is required for this slice.

Minimum expectations:

- prompt records retain `taskType`,
- saved assessments and recent-attempt summaries retain or derive task-family identity,
- Task 1 history views only summarize Task 1 attempts,
- Task 2 history views continue to behave exactly as they do now.

Trend summaries should stay compact and directional. Do not imply that a Task 1 trend card can be compared directly against Task 2 performance.

## UI review guidance

The UI should keep the current lightweight feel while introducing one new high-level decision: **which writing task is being practiced**.

Recommended behaviors:

- show a clear Task 1 / Task 2 switch above the prompt bank,
- update hero, editor, rubric, and history copy to match the active task,
- keep prompt selection scoped to the active task family,
- keep the report readable without forcing chart widgets or dense analytics.

For Task 1 specifically, the report should reinforce overview quality, feature selection, and comparison discipline.

## Verification expectations for review

Before merge, reviewers should be able to confirm:

- the app still boots locally,
- Task 2 still works end-to-end,
- Task 1 can be selected from the UI and assessed end-to-end,
- Task 1 reports use a separate evidence/scoring path,
- Task 1 history stays separate from Task 2 history,
- the live scorer still defaults to Gemini 3 Flash when enabled,
- lint, typecheck, tests, and build all pass.

## Documentation contract for this slice

The merged branch should make these points easy to find:

- Task 1 and Task 2 now share one app shell but use task-aware prompt/scoring/history paths,
- Task 1 uses structured chart-driven prompt fixtures,
- Task 1 scoring remains a practice estimate rather than an official IELTS judgement,
- Gemini 3 Flash remains the default live-scorer path,
- local persistence is still the default storage path,
- no new dependency was introduced for this slice.

## Reviewer checklist

- [ ] Task-family selection exists before prompt selection.
- [ ] Task 1 prompt fixtures are structured and chart-driven.
- [ ] Task 1 scoring uses task-appropriate evidence/rubric wording.
- [ ] Task 1 and Task 2 histories are kept separate.
- [ ] Task 2 behavior remains stable.
- [ ] Gemini 3 Flash remains the default live scorer.
- [ ] No external dependency was added for this slice.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
