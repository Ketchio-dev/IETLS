# IELTS Reading & Writing Hub

A Next.js platform for IELTS Academic practice that now puts Reading and Writing at the center of the primary information architecture, while keeping Speaking alpha and Listening placeholder routes available as secondary modules:

- Task-aware prompt bank for **Writing Task 1 Academic** and **Writing Task 2** with 53 bundled prompts
- Structured Task 1 visual briefs plus the existing Task 2 essay prompts
- Bespoke sample essays for 13 Writing prompts, with task-level fallbacks for the rest of the bank
- Timed drafting shell with live word count, saved-attempt inspection, and quick links into the dashboard
- Dashboard view for recent saved attempts, criterion-trend direction, compare support, scorer usage, and an action-oriented persisted study plan
- Practice estimate report with criterion bands, scorer status, confidence reasons, warnings, and revision actions
- Assessment architecture split into evidence extraction, scoring, and feedback generation
- Local persistence for prompts, recent submissions, saved scorecards, dashboard summaries, and prompt-specific history
- Gemini 3 Flash Preview kept as the default live-scorer model when OpenRouter or Gemini CLI is enabled, with deterministic mock mode available when explicitly selected
- **Reading** module with 18 runtime one-passage practice sets and 184 questions sourced from bundled original content plus local imports
- **Speaking** alpha with transcript-first practice and session persistence, gated off by default in production
- Listening registered as a lightweight placeholder module through the shared assessment seam

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the Reading + Writing hub, `http://localhost:3000/reading` for Reading, `http://localhost:3000/writing` for Writing, `http://localhost:3000/dashboard` for the Writing dashboard, `/speaking` for the Speaking alpha, and `/listening` for the Listening placeholder.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Routes

- `/` → primary hub for Reading and Writing, with secondary links into Speaking alpha and Listening placeholder routes
- `/writing` → writing practice shell with task switching, timed drafting, saved-attempt inspection, and assessment submission
- `/dashboard` → persisted summary of recent saved attempts, criterion trends, compare support, scorer usage, and study-plan guidance
- `/speaking` + `/speaking/dashboard` → Speaking alpha transcript-first practice and dashboard when explicitly enabled
- `/reading` + `/reading/dashboard` → Reading practice module with imported/original passage bank, practice shell, and dashboard (not a full three-passage mock yet)
- `/listening` + `/listening/dashboard` → Listening placeholder routes proving the module seam without fake scoring
- `GET /api/writing/task` → returns the current prompt plus the prompt bank
- `POST /api/writing/assessment` → generates a practice estimate and stores the attempt locally

## Scorer provider configuration

The assessment route defaults to the built-in mock scorer.

To use the local Gemini CLI on the server, set these environment variables before starting the app:

```bash
IELTS_SCORER_PROVIDER=gemini-cli
IELTS_SCORER_MODEL=gemini-3-flash-preview
# optional
GEMINI_CLI_PATH=gemini
GEMINI_CLI_TIMEOUT_MS=45000
```

The current Gemini CLI accepts the official preview model code `gemini-3-flash-preview`; if you set `IELTS_SCORER_MODEL=gemini-3-flash`, the app normalizes it to the preview code before invoking the CLI. Gemini CLI requests fail closed when the binary is missing, the model is unavailable, or the returned JSON breaks the rubric contract.

To use OpenRouter on the server instead, set these environment variables:

```bash
IELTS_SCORER_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-key
IELTS_SCORER_MODEL=google/gemini-3-flash-preview
# optional
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_TITLE=IELTS Reading & Writing Hub
OPENROUTER_TIMEOUT_MS=15000
```

Recommended OpenRouter model: `google/gemini-3-flash-preview`. If you still set `google/gemini-3-flash`, the app normalizes it to the current preview model ID before sending the request. The scorer still validates the returned JSON against the structured rubric contract. When `IELTS_SCORER_PROVIDER=openrouter`, provider outages, invalid upstream payloads, and misconfiguration now fail closed with a retryable error instead of silently substituting a mock score. Use `IELTS_SCORER_PROVIDER=mock` when you want deterministic local scoring on purpose. The report `evaluationTrace` shows whether Gemini CLI, OpenRouter, or the explicit mock scorer produced the final scorecard.

The current OpenRouter path also applies a provisional **overall-band-only** calibration derived from a balanced 300-essay raw benchmark against the public Kaggle Mazlumi Writing dataset. On that benchmark, the raw OpenRouter path measured overall MAE `0.680` with bias `-0.417`; the task-aware calibration projects overall MAE to about `0.637` and bias to about `0.037`. Criterion bands are still the provider's direct output.

For raw-provider benchmarking or calibration refits, disable that layer temporarily:

```bash
IETLS_DISABLE_OPENROUTER_OVERALL_CALIBRATION=true npm run writing:eval -- --input /tmp/openrouter-benchmark.json --scorer configured
```

## Writing eval datasets

When you obtain human-rated Writing essays, you can compare the current scorer against them with the built-in evaluator. Store datasets under `data/evals/writing/` using the template at `data/evals/writing/template.human-rated.json`, then run:

```bash
npm run writing:eval -- --input data/evals/writing/my-human-rated.json
npm run writing:eval -- --input data/evals/writing/my-human-rated.json --format json
npm run writing:eval -- --input data/evals/writing/my-human-rated.json --scorer configured
npm run writing:fit-calibration -- --input /tmp/openrouter-writing-report.json
```

If the source dataset is a CSV like the public Kaggle Mazlumi set, or a richer human-rated CSV with friendlier column names such as `Task Type`, `Prompt Text`, `Response Text`, and `Rater Comments`, convert it first:

```bash
npm run writing:import-eval-csv -- --input /path/to/ielts_writing_dataset.csv
```

The evaluator accepts both full human-rated datasets and overall-only datasets where criterion subscores are missing. The included public Kaggle import currently lands as `data/evals/writing/kaggle-mazlumi-overall.json`. It reports overall MAE/bias, task-level summaries, criterion-level summaries when labels exist, and the largest scoring misses. Use `--scorer mock` for deterministic local calibration checks, or `--scorer configured` when you want to benchmark the currently configured live scorer path.


## Reading content pipeline

The default Reading bundle intentionally stays on original/local-import content only. The current repo ships with 18 runtime practice sets and 184 questions compiled from bundled AI-generated sets, and you can extend that bank with your own licensed or user-supplied `.json` files:

```bash
npm run reading:generate             # generate/import AI-ready reading items
npm run reading:import-private       # compile private imports into the runtime bank
```

You can also supply your own locally sourced `.json` files:

1. Put your personally sourced `.json` files in `data/private-reading-imports/`
2. Run `npm run reading:import-private`

This compiles a local bank to `data/runtime/reading-private-imports.json` and surfaces the import status on `/reading` and `/reading/dashboard`.

The current product surface is intentionally framed as a **Reading practice set** workflow. It does not yet simulate the full IELTS Academic Reading exam shape of three passages in one 60-minute sitting.

A starter template lives at `data/private-reading-imports/template.reading-import.json` and is ignored by the importer until you copy/rename it.

## Speaking alpha gating

Speaking stays transcript-first alpha until a real STT/audio-analysis pipeline exists. In production, the route is disabled by default unless you opt in:

```bash
IETLS_ENABLE_SPEAKING_ALPHA=true npm run dev
```

### Internal-only crawler tooling

Internal crawler scripts still exist for legal/compliance review and local developer experiments, but they are intentionally **not** part of the supported product workflow or the default shipped runtime bundle:

```bash
npm run internal:reading:crawl:ielts-up
npm run internal:reading:crawl:ieltsbuddy
npm run internal:reading:crawl:all
```

If you use those scripts locally, do not treat the resulting files as redistributable product content unless you have verified the source license and obtained any required permission.

## Local persistence

Runtime data is written to `data/runtime/` by default.
You can override this location with:

```bash
IELTS_DATA_DIR=/custom/path npm run dev
```

Persisted data now powers both the practice shell and the dashboard, so saved attempts can be re-opened in the shell while the dashboard reuses the same local-first storage for criterion trends, saved-attempt comparison, and study-plan guidance.

The default runtime persistence adapter now uses SQLite with cookie-scoped user isolation for assessments, attempts, study plans, and speaking sessions, while licensed/local Reading import banks remain file-backed (`src/lib/server/storage.ts`). The repository still reads and writes through a small storage port so the persistence boundary can be swapped in tests or future adapters without changing route/page callers.

A follow-on refactor keeps route/page wiring thin by moving practice-shell and dashboard data loading behind narrow server-side application-service boundaries, then registering each slice behind a shared assessment-workspace registry. Reading and Writing now lead the learner-facing IA, while Speaking and Listening still resolve through the same shared registry/workspace seam with alpha or placeholder readiness.

The current foundation also routes practice-shell, dashboard, and assessment URLs through a shared assessment-module registry/workspace boundary (`src/lib/assessment-modules/`) so new modules can plug into the app without re-hardcoding workspace paths across pages, routes, and components.

## Review and implementation notes

Current review notes for the implemented slices live under `docs/review/`, including:

- `docs/review/writing-task-2-next-slice-review.md`
- `docs/review/writing-task-1-academic-next-slice-review.md`
- `docs/review/writing-dashboard-recent-attempts-review.md`
- `docs/review/writing-dashboard-criterion-trends-review.md`
- `docs/review/writing-application-service-boundary-review.md`
- `docs/review/assessment-module-registry-review.md`
- `docs/review/speaking-alpha-module-review.md`
- `docs/review/verification-lane.md`

These notes capture the task-aware prompt/scoring/history contracts, the persisted dashboard/resume flow, the route/page application-service boundary, the shared assessment-module registry/workspace boundary, the implemented criterion-trend/compare dashboard slice, the stronger study-plan presentation guardrails, the new Speaking alpha second-module validation slice, verification expectations, and the guardrails for keeping Gemini 3 Flash as the default live scorer without adding dependencies.
