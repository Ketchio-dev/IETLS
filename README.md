# IELTS Reading & Writing Hub

A Next.js platform for IELTS Academic practice that now puts Reading and Writing at the center of the primary information architecture, while keeping Speaking alpha and Listening placeholder routes available as secondary modules:

- Task-aware prompt bank for **Writing Task 1 Academic** and **Writing Task 2**
- Structured Task 1 visual briefs plus the existing Task 2 essay prompts
- Timed drafting shell with live word count, saved-attempt inspection, and quick links into the dashboard
- Dashboard view for recent saved attempts, criterion-trend direction, compare support, scorer usage, and an action-oriented persisted study plan
- Practice estimate report with criterion bands, scorer status, confidence reasons, warnings, and revision actions
- Assessment architecture split into evidence extraction, scoring, and feedback generation
- Local persistence for prompts, recent submissions, saved scorecards, dashboard summaries, and prompt-specific history
- Gemini 3 Flash kept as the default live-scorer model when OpenRouter is enabled, with deterministic mock mode available when explicitly selected
- **Reading** module with 51 runtime sets and 617 questions across Academic Reading Test format
- **Speaking** alpha with transcript-first practice and session persistence
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
- `/speaking` + `/speaking/dashboard` → Speaking alpha transcript-first practice and dashboard
- `/reading` + `/reading/dashboard` → Reading module with crawled passage bank, drill interface, and dashboard
- `/listening` + `/listening/dashboard` → Listening placeholder routes proving the module seam without fake scoring
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
OPENROUTER_APP_TITLE=IELTS Reading & Writing Hub
OPENROUTER_TIMEOUT_MS=15000
```

Recommended model: `google/gemini-3-flash`. The scorer still validates the returned JSON against the structured rubric contract. When `IELTS_SCORER_PROVIDER=openrouter`, provider outages, invalid upstream payloads, and misconfiguration now fail closed with a retryable error instead of silently substituting a mock score. Use `IELTS_SCORER_PROVIDER=mock` when you want deterministic local scoring on purpose. The report `evaluationTrace` shows whether OpenRouter or the explicit mock scorer produced the final scorecard.


## Reading content pipeline

The Reading module ships with 51 runtime sets and 617 questions compiled into a runtime bank. You can refresh or extend this bank with the generation + crawl scripts:

```bash
npm run reading:generate             # generate/import AI-ready reading items
npm run reading:crawl                # crawl ielts-up.com (33 passages)
npm run reading:crawl:ieltsbuddy     # crawl ieltsbuddy.com (3 passages)
npm run reading:crawl:all            # run both sources in sequence
npm run reading:import-private       # compile private imports into the runtime bank
```

You can also supply your own locally sourced `.json` files:

1. Put your personally sourced `.json` files in `data/private-reading-imports/`
2. Run `npm run reading:import-private`

This compiles a local bank to `data/runtime/reading-private-imports.json` and surfaces the import status on `/reading` and `/reading/dashboard`.

A starter template lives at `data/private-reading-imports/template.reading-import.json` and is ignored by the importer until you copy/rename it.

## Local persistence

Runtime data is written to `data/runtime/` by default.
You can override this location with:

```bash
IELTS_DATA_DIR=/custom/path npm run dev
```

Persisted data now powers both the practice shell and the dashboard, so saved attempts can be re-opened in the shell while the dashboard reuses the same local-first storage for criterion trends, saved-attempt comparison, and study-plan guidance.

The default runtime persistence adapter remains file-backed (`src/lib/server/storage.ts`), but the repository now reads and writes through a small storage port so the persistence boundary can be swapped in tests or future adapters without changing route/page callers.

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
