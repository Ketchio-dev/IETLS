# Writing human-rated eval datasets

Place human-rated Writing calibration sets in this folder when you want to compare the current scorer against trusted human labels.

## Accepted shape

Use JSON with this top-level structure:

```json
{
  "version": 1,
  "source": "internal-rated-set",
  "essays": [
    {
      "id": "task2-001",
      "taskType": "task-2",
      "prompt": {
        "id": "external-public-transport",
        "title": "Public transport investment",
        "taskType": "task-2",
        "prompt": "Some people believe governments should spend money on improving public transport..."
      },
      "response": "Governments should prioritise public transport because...",
      "overallBand": 6.5,
      "criterionScores": {
        "Task Response": 6.5,
        "Coherence & Cohesion": 6.0,
        "Lexical Resource": 7.0,
        "Grammatical Range & Accuracy": 6.0
      },
      "notes": ["Clear position, weaker support"],
      "raterId": "rater-a",
      "secondRaterId": "rater-b",
      "adjudicated": true
    }
  ]
}
```

## Prompt resolution

Each essay must provide **either**:

1. `promptId` that already exists in `src/lib/fixtures/writing.ts`, or
2. an inline `prompt` object.

Inline prompts can stay minimal:

- `prompt.title`
- `prompt.taskType`
- `prompt.prompt`

Optional prompt metadata like `suggestedWordCount`, `planningHints`, and Task 1 `visual` data can also be included.

## Task-specific criterion keys

### Task 1

- `Task Achievement`
- `Coherence & Cohesion`
- `Lexical Resource`
- `Grammatical Range & Accuracy`

### Task 2

- `Task Response`
- `Coherence & Cohesion`
- `Lexical Resource`
- `Grammatical Range & Accuracy`

All band scores must use **0.5 increments** between `0` and `9`.

Criterion scores are optional when the source dataset only provides an overall human band. In that case the evaluator still computes overall-band error metrics and skips criterion-level summaries for unlabeled essays.

## Importing Kaggle-style CSV files

For CSV exports that look like the public Mazlumi Kaggle file (`Task_Type`, `Question`, `Essay`, `Overall`, and mostly-empty subscore columns), convert them first:

```bash
npm run writing:import-eval-csv -- --input /path/to/ielts_writing_dataset.csv
```

This writes `data/evals/writing/kaggle-mazlumi-overall.json` by default and preserves any non-empty examiner comments.

The importer also accepts richer human-rated CSV aliases when the source file uses friendlier column names. Supported header families include:

- task type: `Task_Type`, `Task Type`, `taskType`
- prompt text: `Question`, `Prompt`, `Task Prompt`
- response text: `Essay`, `Response`, `Essay Text`
- overall band: `Overall`, `Overall Band`, `Overall_Band`, `Band`, `Score`
- criterion bands:
  - Task 1 / Task 2 coverage via `Task_Response`, `Task Response`, `Task Achievement`, `Task_Achievement`
  - `Coherence_Cohesion`, `Coherence & Cohesion`, `CC`
  - `Lexical_Resource`, `Lexical Resource`, `LR`
  - `Range_Accuracy`, `Grammatical Range & Accuracy`, `GRA`
- comments: `Examiner_Commen`, `Examiner_Comment`, `Comment`, `Comments`, `Feedback`, `Notes`

Example human-rated CSV header row:

```csv
Task Type,Prompt,Response,Overall Band,Task Achievement,Coherence & Cohesion,Lexical Resource,Grammatical Range & Accuracy,Comments
```

## Running the evaluator

```bash
npm run writing:eval -- --input data/evals/writing/my-human-rated.json
npm run writing:eval -- --input data/evals/writing/my-human-rated.json --format json
npm run writing:eval -- --input data/evals/writing/my-human-rated.json --scorer configured
```

- `--scorer mock` uses the built-in local scorer and is the safest default.
- `--scorer configured` uses the currently configured live scorer path, so provider errors can fail the run.
- Use `npm --silent run writing:eval -- ... --format json` when you want machine-readable JSON without npm banner noise.

## Output

The evaluator reports:

- overall MAE / bias / RMSE
- per-task error summaries
- per-criterion error summaries
- configured-score vs explicit-mock vs mock-fallback counts
- the biggest overall misses in the dataset

Start with 20-30 essays per task if possible. For stronger calibration decisions, 100+ essays with adjudicated human ratings are much better.

## Refitting overall-band calibration from an evaluation report

After you run a benchmark and save the JSON report, you can derive task-aware linear calibration coefficients with:

```bash
npm run writing:fit-calibration -- --input /tmp/openrouter-writing-report.json
npm run writing:fit-calibration -- --input /tmp/openrouter-writing-report.json --format ts
```

If you are benchmarking the live OpenRouter path and want **raw provider scores** instead of the app's current overall-band calibration layer, run the evaluator with:

```bash
IETLS_DISABLE_OPENROUTER_OVERALL_CALIBRATION=true npm run writing:eval -- --input /tmp/openrouter-writing-report.json --scorer configured
```

The fitter reads `samples[].overall.expectedBand/predictedBand`, splits by `taskType`, and reports:

- intercept / slope
- MAE before / projected MAE after
- projected bias after
- projected within ±0.5 / ±1.0 rates after half-band rounding and band clamping
