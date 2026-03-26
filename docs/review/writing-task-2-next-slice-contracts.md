# Writing Task 2 Next Slice Data Contracts

_Date: March 26, 2026_

This note gives the next implementation slice one concrete source of truth for payload design. It is intentionally small and mock-friendly so service code, tests, and UI rendering can agree on shape before any live LLM integration exists.

## 1) Scorer adapter output

The scorer adapter should return structured rubric results rather than free-form prose. A mock provider can return the same shape deterministically.

```ts
interface ScoreBandRange {
  min: number;
  max: number;
}

interface RubricSignal {
  label: string;
  observation: string;
  strength: 'strong' | 'developing' | 'weak';
}

interface CriterionRubricResult {
  criterion: CriterionName;
  band: number;
  bandRange: ScoreBandRange;
  confidence: ConfidenceLevel;
  rationale: string;
  rubricSignals: RubricSignal[];
}

interface EvaluationTrace {
  traceId: string;
  traceVersion: string;
  provider: 'mock' | 'openai-ready';
  model: string;
  mode: 'heuristic-fallback' | 'llm';
  calibrationHints: string[];
}

interface ScorerAdapterResult {
  overallBand: number;
  overallBandRange: ScoreBandRange;
  criteria: CriterionRubricResult[];
  summary: string;
  trace: EvaluationTrace;
}
```

### Mock fallback expectation

The mock path should:

- return the same keys as a future LLM-backed scorer,
- derive `bandRange` values from deterministic heuristic rules,
- avoid any network access,
- remain stable enough for snapshot-like assertions.

## 2) Normalized app report additions

The UI-facing report can remain the main contract, but it should absorb range/trace metadata so routes and components do not need provider-specific logic.

Suggested additions to `AssessmentReport`:

- `overallBandRange`
- `criterionScores[].bandRange`
- `evaluationTrace`
- `scoringProvider`

Example normalized shape:

```json
{
  "overallBand": 6.5,
  "overallBandRange": { "min": 6.0, "max": 7.0 },
  "scoringProvider": {
    "provider": "mock",
    "model": "heuristic-v1",
    "mode": "heuristic-fallback"
  },
  "evaluationTrace": {
    "traceId": "trace-123",
    "traceVersion": "writing-task-2/v3",
    "calibrationHints": [
      "Task Response supported by a consistent position statement",
      "Grammar estimate still depends on limited sentence-variety evidence"
    ]
  }
}
```

## 3) Recent history summary contract

Keep the history summary separate from the raw attempts list so the UI can render a compact trend card without recomputing semantics inside the component tree.

```ts
interface HistoryTrendSummary {
  direction: 'improving' | 'steady' | 'slipping' | 'insufficient-data';
  attemptsConsidered: number;
  latestOverallBand: number;
  latestOverallBandRange: ScoreBandRange;
  averageOverallBand: number;
  summary: string;
}
```

### Direction guidance

- `improving`: latest attempt is materially better than the prior rolling average.
- `steady`: movement exists but is too small to frame as improvement/regression.
- `slipping`: latest attempt drops beyond the same tolerance.
- `insufficient-data`: fewer than 2 attempts.

Use a simple tolerance so the UI does not overreact to minor half-band noise.

## 4) Persistence notes

If recent attempts are persisted locally, store only the fields needed to rebuild the trend summary plus the stable trace identifiers. Avoid storing provider-internal prompt text or verbose chain-of-thought-like content.

Safe persistence targets:

- `overallBand`
- `overallBandRange`
- criterion ranges/confidence
- `summary`
- `createdAt`
- trace/provider metadata

## 5) Test guidance

Tests for this slice should prove:

- mock scorer output satisfies the adapter contract,
- report normalization preserves range and trace fields,
- history summary direction is deterministic for a known attempt sequence,
- the UI renders range/trend content without needing live services.
