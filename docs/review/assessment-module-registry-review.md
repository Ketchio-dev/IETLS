# Assessment Module Registry / Workspace Boundary Review

_Date: March 26, 2026_

This note documents the smallest shared registry/workspace seam that sits above the current writing application-service boundary. The goal is to preserve the current Writing Task 1 / Task 2 routes, dashboard, APIs, file persistence, and Gemini 3 Flash default scoring path while stopping the top-level app entrypoints from importing writing-only orchestration directly.

## Outcome this slice should deliver

The refactor stays healthy when the merged branch:

1. introduces one shared assessment-workspace registry that can register module metadata plus route/data handlers,
2. keeps **writing** as the default and only registered module for now,
3. routes `/`, `/dashboard`, `GET /api/writing/task`, and `POST /api/writing/assessment` through that shared boundary,
4. preserves the existing writing UX, persistence behavior, and scorer defaults,
5. avoids new dependencies or broad UI rewrites.

## Recommended implementation seam

Keep the new seam narrow:

- add one shared server-side registry/workspace module under `src/lib/server/`,
- register the existing writing application-service functions there,
- let page and route entrypoints import only the shared registry/workspace boundary,
- keep all writing-specific prompt, dashboard, persistence, and scoring logic in the existing writing modules.

## Guardrails for future edits

- Do not duplicate writing orchestration logic inside the shared registry.
- Do not widen this slice into a generic multi-module UI shell until a second module actually exists.
- Do not change the current writing route paths, persisted file names, or scoring provider defaults as part of this boundary extraction.
- Do not bypass the registry from app entrypoints once this seam exists.

## Focused verification expectations

Relevant automated coverage for this slice should include:

- focused tests for the new shared assessment-workspace module,
- route/page tests proving the entrypoints now depend on the shared boundary instead of the writing application-service directly,
- the existing repository, service, and writing component tests to confirm no regression in the current writing flow.
