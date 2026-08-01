# Feature 2.2: Recurring expenses

**Status:** Not started
**Phase:** 2
**Depends on:** [0.1](00-data-layer-repositories.md), [1.1 Categories management](02-categories-management.md) (for `CategoryPicker`)

## Spec reference

`PRODUCT_SPEC.md` → Recurring expenses (read the rent-increase scenario carefully — it's the trickiest part of this feature).

## Scope

- A recurring expenses management screen: add/edit/remove recurring expenses (name, amount, category via `CategoryPicker`, day of month), using `RecurringExpenseRepository` from 0.1.
- Generation logic: each period, an active recurring expense produces a normal `Spending` row with `source: 'recurring'`. This is the core correctness requirement — implement it as: on app foreground (or app start), for each active recurring expense, check whether a `Spending` with that `recurringExpenseId`-equivalent link already exists for the current period (you'll need to decide how to track "which recurring expense generated this spend" — `Spending.note` is not the right place for structured data; if `schema.ts` doesn't have a field for this, that's a real gap, flag it against Feature 0.1 rather than working around it with a hack like encoding IDs into the note field).
- Editing a recurring expense's amount must only affect future-generated entries — already-generated `Spending` rows are untouched (this falls out naturally if generation only reads the recurring expense's *current* amount at generation time, and past spends are already-saved independent rows, per the spec's explanation).

## Owns

- `src/features/recurring-expenses/` — screen, generation logic
- `src/app/recurring-expenses.tsx` (route, linked from Settings — same temporary-link situation as other Phase 1/2 features re: Feature 3.2)
- `src/features/recurring-expenses/__tests__/generation.test.ts` (the generation logic is the highest-risk part of this feature — test it thoroughly and in isolation from any UI)
- Extends: locale files, `src/app/_layout.tsx` (trigger generation check on app foreground — coordinate with 0.1's category-seeding hook if both need to run at startup; sequence generation after seeding, not before, since a recurring expense's category must exist)

## Do not touch

`src/data/schema.ts` — if generation-tracking genuinely needs a schema change (see above), write that up as a specific, minimal proposal (e.g. "add `recurringExpenseId: text('recurring_expense_id')` nullable FK on `spendings`") rather than silently altering the schema or hacking around it; a schema change needs a new migration and affects every other feature that reads `Spending` rows.

## Key implementation notes

- "Each period" = monthly, keyed by `dayOfMonth`. Decide and document your generation trigger precisely (e.g. "on app foreground, if today's day-of-month >= the recurring expense's dayOfMonth AND no spend has been generated for this recurring expense this calendar month, generate one") — this is exactly the kind of logic that's easy to get subtly wrong around month boundaries and skipped app opens (user doesn't open the app for 3 months — should it backfill 3 spends, or just the most recent? Pick one, per spec's spirit backfilling makes sense so history isn't silently missing, but this is a real product decision — state your choice clearly in the PR).
- This is a good candidate for a pure, well-tested function (`computeSpendingsToGenerate(recurringExpenses, existingSpendings, now): SpendingInput[]`) separate from the app-lifecycle wiring, so the tricky date-boundary logic can be unit tested without touching SQLite or app lifecycle at all.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Generation logic has thorough unit tests covering: first-ever generation, already-generated-this-period (no duplicate), amount changed after a past generation (past spend unaffected, next generation uses new amount), app not opened for multiple months (documented backfill behavior).
- [ ] CRUD screen tested via RNTL against a test repository.
- [ ] Verified in the iOS simulator: create a recurring expense, force a generation check, confirm a spend appears with `source: 'recurring'` and correct amount.
