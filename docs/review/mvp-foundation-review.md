# MVP Foundation Review

_Date: March 26, 2026_

## Goal of the first vertical slice

Ship one coherent IELTS Academic **Writing Task 2** practice flow that lets a learner:

1. open a realistic prompt,
2. write inside a timed editor,
3. submit the response,
4. view a mock assessment report with estimated band scores, evidence, and feedback.

The first slice should optimize for **clarity of flow**, **predictable data shapes**, and **easy verification** over model sophistication.

## Recommended app surface

### Core routes

- `/` — landing page with clear CTA into Writing Task 2 practice.
- `/practice/task-2` — prompt selection / prompt intro state.
- `/practice/task-2/session/[sessionId]` — timed editor and save/submit controls.
- `/reports/[reportId]` — mock assessment report view.

### Component boundaries

Keep the UI split into small, replaceable blocks:

- `PromptCard` — prompt metadata and instructions.
- `Timer` — countdown + time warnings.
- `WritingEditor` — answer drafting surface.
- `SessionSummary` — word count, time left, submit state.
- `BandScoreCard` — overall + criterion score presentation.
- `EvidenceList` — evidence spans supporting score/feedback.
- `FeedbackPanel` — strengths, weaknesses, next-step coaching.

## Recommended domain model

Use stable, serializable objects from day one. Suggested entities:

### `WritingPrompt`

- `id`
- `title`
- `taskType` (`"task2"`)
- `question`
- `instructions`
- `timeLimitMinutes`
- `suggestedWordCount`
- `tags`

### `WritingSession`

- `id`
- `promptId`
- `startedAt`
- `submittedAt`
- `timeLimitMinutes`
- `elapsedSeconds`
- `responseText`
- `wordCount`
- `status` (`"draft" | "submitted" | "scored"`)

### `CriterionScore`

- `criterion` (`taskResponse`, `coherenceAndCohesion`, `lexicalResource`, `grammaticalRangeAndAccuracy`)
- `band`
- `summary`
- `confidence`

### `EvidenceSpan`

- `id`
- `quote`
- `startOffset`
- `endOffset`
- `criterion`
- `signalType` (`strength`, `weakness`, `missing`)
- `explanation`

### `FeedbackItem`

- `id`
- `criterion`
- `priority` (`high`, `medium`, `low`)
- `title`
- `message`
- `action`

### `MockAssessmentReport`

- `id`
- `sessionId`
- `estimatedOverallBand`
- `criterionScores`
- `evidence`
- `feedback`
- `generatedAt`
- `reportVersion`

## Service seam review

Keep scoring logic behind explicit layers so the first mock implementation can later be replaced without rewriting the app shell.

- `extractEvidence(session)` → returns `EvidenceSpan[]`
- `scoreResponse(session, evidence)` → returns `CriterionScore[]`
- `generateFeedback(session, scores, evidence)` → returns `FeedbackItem[]`
- `buildReport(session, scores, evidence, feedback)` → returns `MockAssessmentReport`

### Review guidance

- UI code should consume **report objects**, not scoring internals.
- Route handlers should orchestrate services but avoid embedding scoring heuristics inline.
- Fixtures should exercise at least one strong essay and one weak essay to keep feedback/report UI honest.

## Quality risks to watch early

1. **Timer/editor state drift** — avoid splitting timing state across multiple sources of truth.
2. **Loose JSON shapes** — centralize types for prompt/session/report objects.
3. **UI tightly coupled to mock logic** — keep mock scoring replaceable.
4. **Report over-verbosity** — the first report should be readable in under a minute.
5. **No verification contract** — every branch should preserve `dev`, `lint`, `typecheck`, and `test` entry points.

## Definition of a good first slice

A good MVP branch should make it possible to:

- start the app without hidden setup,
- complete one Writing Task 2 session from prompt to report,
- inspect sample fixture data without live services,
- run basic verification locally,
- understand where future scoring improvements plug in.
