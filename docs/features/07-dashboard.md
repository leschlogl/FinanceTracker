# Feature 3.1: Dashboard

**Status:** Not started
**Phase:** 3
**Depends on:** [0.1](00-data-layer-repositories.md), [1.1 Categories management](02-categories-management.md)

## Spec reference

`PRODUCT_SPEC.md` → Dashboard. Note the income/savings/cash-flow views are explicitly gated on the (not-yet-built) Roadmap income feature — don't build UI for those now, just leave the current-month/yearly views structured so that section can be added later without a rewrite.

## Scope

- Current month view: total spent, spend-by-category breakdown (chart), comparison against previous month's total.
- Yearly view: total spent per month across the year (chart), spend-by-category breakdown for the year.
- Replace the `src/app/index.tsx` placeholder with the real dashboard (both views, e.g. a segmented control or tabs-within-the-screen to switch between Current Month / Yearly — your call on the exact UI pattern, just keep it simple).

## Owns

- `src/features/dashboard/` — screen(s), chart components, aggregation logic
- Rewrites: `src/app/index.tsx` (becomes a thin route rendering the dashboard feature)
- `src/features/dashboard/__tests__/aggregation.test.ts`
- Extends: locale files

## Do not touch

Nothing outside `src/features/dashboard/` and `src/app/index.tsx` should need changes — this feature only reads via `SpendingRepository`/`CategoryRepository`, it doesn't need to modify them. If it does, that's a signal a read method is missing from 0.1's repositories; add it there, small and scoped.

## Key implementation notes

- Charting library isn't chosen yet — pick something that works in the Expo managed workflow without a dev client (i.e. pure JS/SVG-based, not something requiring native linking beyond what's already installed). Check what's already a dependency before adding a new one; if nothing suitable exists, a minimal hand-rolled bar/pie using `react-native-svg` (commonly already present as an Expo/React Navigation transitive dependency — verify before assuming) is preferable to pulling in a heavy charting package for two chart types.
- Aggregation (totals, category breakdowns, month-over-month comparison) should be pure functions operating on arrays of `Spending` fetched via the repository — testable without rendering anything, same pattern as Feature 2.2's generation logic.
- Reuse `src/lib/currency.ts` (from Feature 1.2) for all amount display — don't reimplement formatting here.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Aggregation functions unit tested independently of any UI/chart rendering (edge cases: no spendings at all, spendings in only one category, month with zero spend for comparison).
- [ ] Verified in the iOS simulator with real seeded data (add several spends across categories and months via the Add Spend flow first) — confirm totals and chart values are actually correct, not just that something renders.
