# Reading/Writing-First UI Pass — Design Review

**Reviewer:** worker-3 (designer)
**Date:** 2026-03-27
**Scope:** `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/reading/page.tsx`, `src/app/writing/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/globals.css`

## Verdict: PASS

The Reading/Writing-first hierarchy is well-implemented across all reviewed surfaces. The design system is coherent, accessible, and the primary/secondary distinction is enforced at every layer.

---

## 1. Homepage (`src/app/page.tsx`)

### Strengths
- **Clear information hierarchy**: Primary modules (Reading, Writing) render first with `"Primary practice track"` eyebrows, `"Full"` status badges, and primary CTA buttons. Secondary modules (Speaking, Listening) are separated by a `section-divider` and use distinct eyebrows (`"Experimental module"`, `"Secondary placeholder"`).
- **Data-driven module cards**: The `ModuleCard` interface enforces a consistent shape with typed `priority`, `status`, and `actions`. The `renderModuleCards()` helper keeps rendering DRY across both sections.
- **Hero design**: The hero section leads with Reading + Writing CTAs, a focus panel with live metrics (reading accuracy, writing band), and route pills showing Core/Explore/Seam status per module.
- **Quick-actions strip**: Four cards give direct access to practice and dashboard routes, all Reading/Writing-forward.
- **SVG icons**: Inline icon components (`ReadingIcon`, `WritingIcon`, `SpeakingIcon`, `ListeningIcon`) are lightweight and accessible (`aria-hidden="true"` on containers).

### Observations
- The `moduleIcons` record keys are plain strings (`'writing'`, `'reading'`). This works because card IDs match, but a shared enum or `as const` array could prevent silent mismatches if module IDs ever drift.
- The Listening card's `stats` slice (`slice(0, 3)`) is safe given the placeholder contract always returns 3 status cards, but is worth noting as a coupling point.

## 2. Layout / Navigation (`src/app/layout.tsx`)

### Strengths
- **Nav link ordering**: Reading and Writing appear first in the `navLinks` array, ensuring DOM order matches visual priority.
- **Primary/secondary styling**: `tier` field drives class selection — primary links get `site-nav-link`, secondary links get `site-nav-link site-nav-link--secondary` (reduced opacity).
- **Brand text**: `"IELTS Academic"` kicker + `"Reading + Writing"` brand reinforces the hierarchy at every page load.
- **Colored nav dots**: Each module gets a visually distinct dot via `site-nav-dot--{module}` classes tied to CSS custom properties.
- **Label suffixes**: Speaking shows `"Speaking alpha"`, Listening shows `"Listening placeholder"` — clear expectation-setting.

### Observations
- The `Dashboards` link at `href="/reading/dashboard"` only routes to Reading's dashboard. If the intent is a combined entry point, this could be confusing. If intentional (Reading is the strongest dashboard), it's fine but could benefit from a tooltip or aria-label clarification.

## 3. Reading Page (`src/app/reading/page.tsx`)

### Strengths
- Thin server component — delegates entirely to `loadAssessmentPracticePageData` and renders `ReadingPracticeShell`. Clean separation of data loading and presentation.
- Properly awaits `searchParams` (Next.js 15+ pattern).

## 4. Writing Page (`src/app/writing/page.tsx`)

### Strengths
- Same thin-server pattern as Reading.
- `getSingleSearchParam` helper safely normalizes `string | string[] | undefined` to `string | undefined`.
- Uses `Promise.resolve(searchParams)` to handle both Promise and plain object signatures.

## 5. Dashboard Page (`src/app/dashboard/page.tsx`)

### Strengths
- Minimal — loads data via `loadDefaultAssessmentDashboardPageData()` and passes to `WritingDashboard`. No unnecessary logic.

## 6. Global Styles (`src/app/globals.css`)

### Strengths
- **Design token system**: CSS custom properties (`:root`) provide a single source of truth for colors, module accents, and semantic tokens (`--bg`, `--panel`, `--text`, `--muted`, `--accent`).
- **Module color theming**: Each module card gets a `border-top`, eyebrow color, icon background, stat color, and button color via `[data-module]` selectors — scalable and maintainable.
- **Status badge variants**: `[data-status]` selectors (`Full`, `Alpha`, `Placeholder`) give distinct visual treatment with appropriate semantic colors (green, orange, purple).
- **Responsive grid**: Desktop breakpoint at 800px upgrades single-column layouts to multi-column grids. `module-hub-grid` goes to 2-col, `module-stat-grid` to 3-col, `focus-signal-grid` to 3-col.
- **Interaction design**: Hover states include subtle `translateY(-2px)` lifts and box-shadow transitions. Focus-visible outlines use accent color for keyboard accessibility.
- **Quick-actions strip**: Staggered animation delays (`0.04s` increments) add polish on load.
- **Secondary de-emphasis**: `.module-card--experimental` uses dashed borders and reduced opacity — a clear visual signal that these modules are not production-ready.

### Observations
- The `.experimental-section` and `.module-card--experimental` classes are defined but not used in the current `page.tsx` (the secondary section uses `secondary-section` class instead). These may be legacy from an earlier design pass and could be pruned if unused elsewhere.
- `.site-nav-link--experimental` and `.site-nav-exp-badge` are also unused in `layout.tsx`. Same pruning opportunity.

## 7. Test Coverage

### Summary
- **5 test files, 23 tests, all passing** covering the reviewed pages.
- `page.test.tsx` (homepage): 9 tests verify primary/secondary separation, DOM ordering, route pills, focus signals, metric cards, icon rendering, and status badges.
- `layout.test.tsx`: 7 tests verify nav ordering, brand text, dot classes, secondary labels, primary/secondary styling, and kicker placement.
- `reading/page.test.tsx`: 1 test verifies data flow through assessment workspace.
- `writing/page.test.tsx`: 2 tests verify prompt/attempt parameter pass-through.
- `dashboard/page.test.tsx`: 1 test verifies thin delegation pattern.

### Observation
- Homepage tests use both inline fixture construction (first two tests) and the `setupMocks()` helper (remaining tests). The inline approach duplicates ~100 lines of fixture setup. This is functional but the helper-based approach is cleaner and could be extended to the first two tests.

## 8. Verification Evidence

| Check | Result |
|---|---|
| `tsc --noEmit` | PASS (zero errors) |
| `vitest run` (5 files) | PASS (23/23 tests) |
| `eslint` (5 .tsx files) | PASS (zero errors) |
| CSS lint | Skipped (no CSS linter configured) |

## 9. Design Coherence Summary

The Reading/Writing-first hierarchy is consistently enforced across:
- **Navigation**: Reading + Writing first, primary styling; Speaking/Listening secondary with qualifier labels
- **Homepage hero**: CTAs route to Reading and Writing only
- **Module cards**: Primary section (Reading, Writing) with "Full" badges; Secondary section (Speaking, Listening) with "Alpha"/"Placeholder" badges, separated by a divider
- **Quick actions**: All four slots are Reading/Writing-focused
- **Focus signals**: Reading momentum + Writing band metrics in the hero panel
- **Color system**: Four distinct module colors consistently applied across cards, icons, stats, buttons, nav dots, and route pills
- **Responsive behavior**: Grid layouts adapt gracefully from mobile to desktop

No blocking issues found. The implementation is production-ready.
