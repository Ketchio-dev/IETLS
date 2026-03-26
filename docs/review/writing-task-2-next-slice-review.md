# Writing Task 2 Next Slice Review

_Date: March 26, 2026_

This review note documents the next production-facing slice for the IELTS Academic Writing Task 2 MVP. It is written to keep implementation, testing, and merge review aligned while the scoring stack remains fixture-driven.

## Outcome this slice should deliver

The merged branch should preserve the existing prompt → draft → report → history flow while upgrading the assessment contract in four practical ways:

1. add an LLM-ready scorer adapter contract with a deterministic mock fallback,
2. report score **ranges** instead of a single-band-only confidence summary,
3. capture evaluation trace fields that are useful for future calibration work,
4. expose a lightweight history summary on the UI that shows recent direction of travel.

The goal is better product readiness without introducing new infrastructure or external dependencies.

## Architecture contract

Keep the scoring pipeline layered so the UI still consumes one stable report object.

### Recommended seam

- `extractWritingEvidence(...)` stays responsible for rule/rubric signals.
- `scoreWithProvider(...)` (or equivalent) should sit behind a provider interface rather than being called directly from routes or components.
- `buildAssessmentReport(...)` should normalize provider output into app-facing report fields.
- UI components should receive the normalized report/history model, not provider-specific payloads.

### Scorer adapter expectations

A provider contract for this slice should be able to support both the current heuristic model and a future LLM call without changing route/component code.

Suggested responsibilities:

- accept prompt, submission, and extracted evidence,
- return criterion-level structured rubric output,
- expose provider metadata (`provider`, `model`, `mode`, `version`),
- fall back to a mock provider when no live scorer is configured.

Suggested structured output fields:

- `criterion`
- `band`
- `rangeMin`
- `rangeMax`
- `confidence`
- `rationale`
- `rubricAnchors` or equivalent structured support notes
- `trace` / `traceId` / `traceVersion` metadata suitable for calibration logs

## Report-shape guidance

The app-facing report should now describe uncertainty directly instead of only implying it through confidence labels.

Recommended additions:

- overall score range (`overallBandRange` or equivalent),
- criterion score ranges,
- evaluator metadata for the active provider,
- evaluation trace metadata that can later support calibration review,
- a short user-facing explanation that this remains a practice estimate.

Keep range fields small and readable. A half-band range is usually easier to scan than verbose prose.

## UI review guidance

The web UI should stay lightweight. Prefer one compact history summary card over a dense analytics panel.

Recommended history summary behaviors:

- derive trend direction from the most recent attempts already stored locally,
- show whether the learner is improving, flat, or slipping,
- keep the summary readable without requiring charts,
- avoid implying exam-grade precision.

A practical summary can include:

- recent average or latest range,
- trend direction label,
- number of attempts used,
- one sentence that explains what changed.

## Code-quality guardrails

Use this slice to improve replaceability rather than sophistication.

- Do not let route handlers encode scorer heuristics inline.
- Do not let React components depend on mock-provider details.
- Keep fallback behavior deterministic so tests remain stable.
- Prefer extending central domain types over introducing loose ad-hoc JSON.
- Keep calibration trace fields structured and serializable from day one.
- Preserve the runnable local-only workflow; no new credentials should be required.

## Verification expectations for review

Before merge, reviewers should be able to confirm:

- the app still runs locally with `npm run dev`,
- the scorer path works with the mock fallback only,
- reports show range-based output plus trace-friendly metadata,
- the history area shows recent trend direction,
- lint, typecheck, tests, and build all pass.

## Documentation contract for this slice

The merged branch should make these points easy to find:

- the scorer adapter is intentionally provider-agnostic,
- the mock scorer is the default local path,
- range reporting is a practice estimate, not an official IELTS score,
- evaluation traces exist for future calibration rather than current end-user decision making,
- progress history is directional coaching, not validated measurement.

## Reviewer checklist

- [ ] Adapter boundary exists and is not bypassed by routes/UI.
- [ ] Mock fallback works without secrets.
- [ ] Range fields are present in the normalized report object.
- [ ] Trace metadata is structured, serializable, and persisted where needed.
- [ ] History summary is compact and derived from recent attempts.
- [ ] No external dependency was added for this slice.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
