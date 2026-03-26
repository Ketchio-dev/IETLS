# IELTS Academic Writing MVP

A Next.js MVP for IELTS Academic Writing practice with a task-aware writing shell and a persisted review dashboard:

- Task-aware prompt bank for **Writing Task 1 Academic** and **Writing Task 2**
- Structured Task 1 visual briefs plus the existing Task 2 essay prompts
- Timed drafting shell with live word count, saved-attempt inspection, and quick links into the dashboard
- Dashboard view for recent saved attempts, criterion-trend direction, compare support, scorer usage, and an action-oriented persisted study plan
- Practice estimate report with criterion bands, scorer status, confidence reasons, warnings, and revision actions
- Assessment architecture split into evidence extraction, scoring, and feedback generation
- Local persistence for prompts, recent submissions, saved scorecards, dashboard summaries, and prompt-specific history
- Gemini 3 Flash kept as the default live-scorer model when OpenRouter is enabled, with deterministic mock fallback

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the practice shell and `http://localhost:3000/dashboard` for the saved-attempt dashboard.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Routes

- `/` → writing practice shell with task switching, timed drafting, saved-attempt inspection, and assessment submission
- `/dashboard` → persisted summary of recent saved attempts, criterion trends, compare support, scorer usage, and study-plan guidance
- `GET /api/writing/task` → returns the current prompt plus the prompt bank
- `POST /api/writing/assessment` → generates a practice estimate and stores the attempt locally

## Scorer provider configuration

The assessment route defaults to the built-in mock scorer. To use OpenRouter on the server, set these environment variables before starting the app:

```bash
IELTS_SCORER_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-key
IELTS_SCORER_MODEL=google/gemini-3-flash
# optional
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_TITLE=IELTS Academic Writing MVP
OPENROUTER_TIMEOUT_MS=15000
```

Recommended model: `google/gemini-3-flash`. The scorer still validates the returned JSON against the structured rubric contract and automatically falls back to the mock scorer when config is missing, the request fails, or the provider output is invalid. The report `evaluationTrace` shows whether OpenRouter or the mock fallback produced the final scorecard.

## Local persistence

Runtime data is written to `data/runtime/` by default.
You can override this location with:

```bash
IELTS_DATA_DIR=/custom/path npm run dev
```

Persisted data now powers both the practice shell and the dashboard, so saved attempts can be re-opened in the shell while the dashboard reuses the same local-first storage for criterion trends, saved-attempt comparison, and study-plan guidance.

The default runtime persistence adapter remains file-backed (`src/lib/server/storage.ts`), but the repository now reads and writes through a small storage port so the persistence boundary can be swapped in tests or future adapters without changing route/page callers.

## Review and implementation notes

Current review notes for the implemented slices live under `docs/review/`, including:

- `docs/review/writing-task-2-next-slice-review.md`
- `docs/review/writing-task-1-academic-next-slice-review.md`
- `docs/review/writing-dashboard-recent-attempts-review.md`
- `docs/review/writing-dashboard-criterion-trends-review.md`
- `docs/review/verification-lane.md`

These notes capture the task-aware prompt/scoring/history contracts, the persisted dashboard/resume flow, the implemented criterion-trend/compare dashboard slice, the stronger study-plan presentation guardrails, verification expectations, and the guardrails for keeping Gemini 3 Flash as the default live scorer without adding dependencies.
