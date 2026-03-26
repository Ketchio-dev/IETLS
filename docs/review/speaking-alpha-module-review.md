# Speaking Alpha Second-Module Validation Review

_Date: March 26, 2026_

This review note documents the next platform slice after the writing MVP: validate that the shared assessment-module registry/server seam can carry a second module by adding a Speaking alpha scaffold. The goal is structural proof, not a production-speaking feature. Writing remains the fully working default experience while this slice exercises the shared boundary and keeps room for concurrent registry/server seam edits.

## Outcome this slice should deliver

The branch stays healthy when it:

1. keeps the current Writing Task 1 / Task 2 practice shell, dashboard, and assessment flows working exactly as they do now,
2. registers a second module entry for Speaking alpha through the shared assessment-module boundary,
3. uses the existing server-facing seam for module resolution instead of re-hardcoding writing-specific orchestration in routes or pages,
4. exposes only the minimum Speaking alpha surface needed to prove module selection, module metadata, and workspace routing,
5. avoids introducing audio capture, ASR, pronunciation scoring, or any other production-grade speaking pipeline in this slice,
6. keeps Gemini 3 Flash as the default live scorer for the writing path and does not disturb the current fallback behavior,
7. avoids new dependencies, broad refactors, or renaming the current writing URLs.

## Current baseline findings

The repo already has the right foundation for a second-module validation slice:

- `src/lib/assessment-modules/registry.ts` is the shared module registry surface, and writing is currently the only live module.
- `src/lib/assessment-modules/workspace.ts` holds the shared workspace metadata/helpers that routes and UI can consume.
- `src/lib/server/assessment-workspace.ts` is the server-facing facade that resolves module behavior through the registry-backed seam.
- `src/lib/server/writing-assessment-repository.ts` still owns the writing persistence boundary, which should remain untouched for this slice.
- `src/app/page.tsx`, `src/app/dashboard/page.tsx`, and the writing API routes already prove that the writing flow can stay thin while the module seam grows.

That baseline means the Speaking alpha work should extend the shared contract rather than invent a second parallel workspace system.

## Scope of the slice

The slice should stay narrow and validation-oriented.

### In scope

- A Speaking alpha module entry in the shared registry.
- Workspace metadata that can identify the second module cleanly.
- Minimal route/page wiring that proves the app can resolve a non-writing module through the shared seam.
- Thin placeholder UX or stubbed state that confirms the module boundary works.
- Tests that prove the registry and server seam can resolve both the writing module and the new Speaking alpha module.

### Out of scope

- Full audio recording or upload flow.
- STT/ASR integration.
- Pronunciation, fluency, or accent scoring logic.
- Production speaking prompt generation or evaluation calibration.
- Database migration work.
- New dependencies or a rewrite of the current writing persistence model.

## Recommended implementation seam

Keep the change additive and shared-boundary first:

1. Register Speaking alpha alongside writing in the shared assessment-module registry.
2. Reuse the existing server-facing module resolution seam so route/page callers stay thin.
3. Keep writing orchestration and persistence untouched.
4. Make the Speaking alpha surface as small as possible while still proving the registry can carry a second module.

This slice is successful if the new module can exist without forcing the current writing UX to change shape.

## Constraints and guardrails

- Do not rename or move the current writing routes just to make the second module feel more generic.
- Do not reintroduce a duplicate workspace shim or a second registry layer.
- Do not add audio or ML dependencies in the name of “future-proofing.”
- Do not change the writing scorer default away from Gemini 3 Flash.
- Do not collapse writing history, dashboard, or prompt-bank semantics into a module-agnostic abstraction.
- Treat the registry/server seam as a shared surface: concurrent edits may land there, so prefer merge-friendly changes over rewrites.
- Keep the Speaking alpha slice validation-focused; it should prove the seam, not finish the whole speaking product.

## Verification expectations

Before merge, reviewers should expect:

- targeted tests proving both modules resolve through the shared registry/server seam,
- unchanged writing-shell and dashboard coverage so the current MVP behavior stays intact,
- smoke tests or route tests for any Speaking alpha placeholder surface that is added,
- `npm run lint`,
- `npm run typecheck`,
- `npm run test`,
- `npm run build`.

If the Speaking alpha slice remains mostly structural, the verification should still show that the new module registration does not regress the writing path and that the shared seam can represent a second module cleanly.

## Reviewer checklist

- [ ] Writing still behaves exactly as it did before the second-module slice.
- [ ] Speaking alpha is registered through the shared assessment-module seam.
- [ ] No duplicate workspace layer was added.
- [ ] No audio/STT/ASR dependency was introduced.
- [ ] Gemini 3 Flash remains the default live scorer for writing.
- [ ] Shared registry/server changes remain merge-friendly with concurrent edits.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.
