# Feature 1.3: Spendings list

**Status:** Not started
**Phase:** 1
**Depends on:** [0.1](00-data-layer-repositories.md), [0.2](01-design-system-primitives.md), [1.2 Manual spend entry](03-manual-spend-entry.md) (soft — see below)

## Spec reference

`PRODUCT_SPEC.md` → Spendings list.

## Scope

- Replace the `src/app/spendings.tsx` placeholder with the real list: grouped by month, each row showing merchant, category, amount, date (`Card` from 0.2).
- Filter by category (a simple picker/chip row using `CategoryPicker` from 1.1, or a lighter filter-specific variant if `CategoryPicker`'s single-select UX doesn't fit a filter — your call, but reuse its data-fetching, don't re-query categories separately).
- Free-text search across merchant/note — the repository already supports this (`SpendingRepository`, built in 0.1); this feature just wires a search input (`Input` from 0.2) to it, debounced.
- Tapping a row navigates to edit (`src/app/edit-spend/[id].tsx` from 1.2). Row delete action calls the delete function 1.2 exposed.
- Empty state (`EmptyState` from 0.2) when there are no spendings, and a separate one for "no results" when a filter/search yields nothing.

## Owns

- `src/features/spendings/SpendingsListScreen.tsx`, plus any row/section components under `src/features/spendings/`
- Rewrites: `src/app/spendings.tsx` (becomes a thin route that renders `SpendingsListScreen`)
- Extends: locale files (`spendings.*` keys — coordinate with 1.2 if it already added some, don't duplicate keys)

## Do not touch

`src/app/add-spend.tsx`, `src/app/edit-spend/[id].tsx`, `src/features/spendings/ConfirmSpendScreen.tsx` (1.2's) — this feature navigates to them, doesn't modify them. If 1.2 isn't done yet when you start this, stub the navigation target and note it in your Status update rather than building a competing edit screen.

## Key implementation notes

- Month grouping: derive section boundaries from `Spending.date` (a real JS `Date` via Drizzle's timestamp mode, per 0.1's notes) — group in JS after fetching a reasonable window (e.g. last 12 months) rather than one query per month.
- Reuse `src/lib/currency.ts` (from 1.2) for amount display formatting — don't reimplement `Intl.NumberFormat` calls here.
- Keep list rendering performant with a real `FlatList`/`SectionList` (React Native's built-in), not a `ScrollView` mapping over all items — this list can grow large over months of use.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Tests cover: month grouping logic (pure function, easy to unit test in isolation), category filter, search (including the "no results" empty state).
- [ ] Verified in the iOS simulator: add a few spends via the Add Spend flow, confirm they group correctly by month and search/filter work.
