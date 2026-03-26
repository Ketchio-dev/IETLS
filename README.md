# IELTS Academic Writing MVP

A greenfield Next.js MVP for IELTS Academic Writing practice with a writing-first vertical slice:

- Task 2 prompt briefing and rubric focus
- Timed essay editor with live word count
- Mock assessment report UI with predicted band, evidence, and next steps
- API scaffolding for prompt delivery and rule-based assessment generation
- Verification commands to keep the repo runnable

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
- `POST /api/writing/assessment` → returns a mock assessment report for submitted writing
