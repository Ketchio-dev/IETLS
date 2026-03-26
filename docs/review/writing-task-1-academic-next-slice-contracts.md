# Writing Task 1 Academic Next Slice Data Contracts

_Date: March 26, 2026_

This note gives the Task 1 Academic slice one concrete source of truth for payload design. It is intentionally small, fixture-friendly, and compatible with the current mock-first architecture.

## 1) Prompt contract

The current `WritingPrompt` shape is Task 2-biased. For Task 1, prefer a discriminated prompt family so structured visual briefs do not get flattened into generic prose.

```ts
type WritingTaskType = 'task-1' | 'task-2';

interface BaseWritingPrompt {
  id: string;
  title: string;
  taskType: WritingTaskType;
  recommendedMinutes: number;
  suggestedWordCount: number;
  prompt: string;
  planningHints: string[];
  rubricFocus: string[];
}

interface Task1ChartDescriptor {
  chartType: 'line' | 'bar' | 'table' | 'pie' | 'process' | 'map';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  unit?: string;
  categories: string[];
  series: Array<{
    label: string;
    values: Array<number | string>;
  }>;
}

interface Task1WritingPrompt extends BaseWritingPrompt {
  taskType: 'task-1';
  questionType: 'Report summary';
  visual: Task1ChartDescriptor;
  overviewExpectations: string[];
}

interface Task2WritingPrompt extends BaseWritingPrompt {
  taskType: 'task-2';
  questionType: string;
  keywordTargets: string[];
}
```

### Contract guidance

- Keep Task 2 prompt fields stable unless widening them is required for the union.
- Keep Task 1 prompts text-first so tests can run without image tooling.
- Prefer fixture data that supports deterministic overview/comparison assertions.

## 2) Task-aware assessment request

The current request can remain compact, but the selected prompt must resolve to a task-aware contract.

```json
{
  "promptId": "task-1-line-graph-library-visits",
  "response": "The line graph shows ...",
  "timeSpentMinutes": 18
}
```

Request bodies do not need a second explicit `taskType` field if `promptId` resolves unambiguously. Internally, however, the pipeline should carry `taskType` so routing, scoring, and persistence never infer it from UI copy.

## 3) Task 1 criterion/scoring contract

Task 1 should not reuse the Task 2-specific criterion label `Task Response`.

A practical public contract is:

```ts
type CriterionNameTask1 =
  | 'Task Achievement'
  | 'Coherence & Cohesion'
  | 'Lexical Resource'
  | 'Grammatical Range & Accuracy';
```

Task 1 evidence should support at least these structured checks:

```ts
interface Task1EvidenceSignal {
  id: string;
  criterion: CriterionNameTask1 | 'Overall';
  label: string;
  strength: 'strong' | 'developing' | 'weak';
  detail: string;
  source: 'rule-based' | 'rubric-based' | 'model-ready';
}
```

Recommended Task 1-specific signal themes:

- overview present / missing,
- key features selected / omitted,
- comparison quality,
- data reference discipline,
- paragraph grouping quality.

## 4) Normalized report additions

The app-facing report should stay broadly aligned with the current report shape, but it needs enough task metadata to keep rendering and persistence honest.

Suggested additions:

- `taskType`
- task-aware criterion labels
- task-aware evaluation trace metadata

Example normalized shape:

```json
{
  "promptId": "task-1-line-graph-library-visits",
  "taskType": "task-1",
  "overallBand": 6.5,
  "overallBandRange": { "lower": 6.0, "upper": 7.0 },
  "criterionScores": [
    {
      "criterion": "Task Achievement",
      "band": 6.0,
      "bandRange": { "lower": 5.5, "upper": 6.5 },
      "confidence": "medium",
      "rationale": "The response includes an overview and several accurate comparisons, but it misses one notable contrast."
    }
  ],
  "evaluationTrace": {
    "schemaVersion": "writing-rubric-scorecard/v1",
    "taskType": "task-1",
    "scorerProvider": "mock-rule-based",
    "scorerModel": "heuristic-v1",
    "rubricVersion": "ielts-academic-writing-task-1/v1"
  }
}
```

## 5) Persistence and history contract

Task 1 and Task 2 attempts must remain separable at rest.

Minimum persistence targets:

- `promptId`
- `taskType`
- `overallBand`
- `overallBandRange`
- criterion scores/ranges
- `summary`
- `createdAt`
- trace/provider metadata

History summaries should either:

- store `taskType` directly, or
- derive it from prompt metadata before rendering.

The UI contract should never need to guess whether a saved attempt belongs to Task 1 or Task 2.

## 6) Test guidance

Tests for this slice should prove:

- Task 1 fixtures satisfy the structured prompt contract,
- Task 1 scoring uses Task 1 rubric wording,
- Task 1 history is filtered independently from Task 2 history,
- Task-family switching updates prompt/report/history content coherently,
- existing Task 2 tests still pass without expectation churn unrelated to Task 1.
