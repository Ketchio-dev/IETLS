# IELTS Academic Writing MVP

A Next.js MVP for IELTS Academic Writing practice with a writing-first vertical slice:

- Task 2 prompt briefing and rubric focus
- Timed essay editor with live word count
- Practice estimate report with criterion bands, confidence reasons, warnings, and revision actions
- Assessment architecture split into evidence extraction, scoring, and feedback generation
- Local persistence for recent submissions and score history
- API scaffolding for prompt delivery, assessment submission, and attempt history

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## API routes

- `GET /api/writing/task` → returns the sample Writing Task 2 prompt fixture
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
