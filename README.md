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

## Local persistence

Runtime data is written to `data/runtime/` by default.
You can override this location with:

```bash
IELTS_DATA_DIR=/custom/path npm run dev
```
