# Feature 1.2: Manual spend entry (Confirm Spend screen)

**Status:** Not started
**Phase:** 1
**Depends on:** [0.1](00-data-layer-repositories.md), [0.2](01-design-system-primitives.md), [1.1 Categories management](02-categories-management.md) (for `CategoryPicker`)

## Spec reference

`PRODUCT_SPEC.md` → ApplePay capture flow (steps 2–4, "Confirm Spend" screen + manual entry), Data model.

## Scope

This builds the **Confirm Spend** screen that both manual entry and (later) the Apple Pay Shortcuts flow (Feature 2.1) share — build it generically from the start, don't hardcode manual-only assumptions.

- **Do not add a "+ Add Spend" entry point anywhere in this feature** (see Owns/Do-not-touch below) — 1.2 and 1.3 both originally claimed `src/app/spendings.tsx`, which is a real conflict since they run in parallel from the same base commit. 1.3 (Spendings list) now exclusively owns `src/app/spendings.tsx`, including wiring its own "+ Add Spend" button to this feature's `/add-spend` route. This feature only needs to make sure `/add-spend` and `/edit-spend/[id]` exist and work correctly in isolation (verify via direct navigation/deep link in tests, not via a button you build).
- Confirm Spend screen: amount (required), merchant (optional text), category (required, via `CategoryPicker` from 1.1), date (defaults to now, editable), note (optional). Save persists via `SpendingRepository.create` with `source: 'manual'`.
- Edit: same screen, pre-filled from an existing spend, `SpendingRepository.update`.
- Delete: from wherever a spend is displayed (this feature doesn't own a list yet — expose a `deleteSpending` action/hook here that Feature 1.3 will wire into its list rows, since 1.3 depends on this feature).
- Amount input: user types a decimal display value (e.g. "12.99"); this feature owns the conversion to/from the integer minor-units storage format (see `schema.ts` comment) — put that conversion in `src/lib/currency.ts` since Feature 3.1 (Dashboard) and 1.3 (list) will need the same formatting logic for display.

## Owns

- `src/features/spendings/ConfirmSpendScreen.tsx` (or split further if it grows — your call, just keep it under `src/features/spendings/`)
- `src/app/add-spend.tsx`, `src/app/edit-spend/[id].tsx` (routes)
- `src/lib/currency.ts` (amount parsing/formatting — minor units ⇄ display string, `Intl.NumberFormat` per `CLAUDE.md`)
- `src/lib/__tests__/currency.test.ts`
- Extends: locale files (`confirmSpend.*` keys — don't add `spendings.*` keys, those belong to 1.3)

## Do not touch

`src/design-system/CategoryPicker.tsx` (1.1's) — import and use it, don't fork it. `src/data/spendingRepository.ts` (0.1's) — same rule as always, extend upstream if a method is missing rather than bypassing it. `src/app/spendings.tsx` — belongs entirely to Feature 1.3, do not touch it or add anything to it, not even temporarily.

## Key implementation notes

- Deep link params (Feature 2.1) will eventually pre-fill this same screen with `amount`/`merchant`/`currency` from the Shortcuts automation — design the screen's params/state shape so "pre-filled from a deep link" and "pre-filled from editing an existing spend" are the same code path, just different initial values. Don't build a second screen for the Apple Pay case later.
- `currency` field: for v1 this is just the user's configured currency, echoed onto the spend (`Spending.currency`) — no currency picker UI needed yet (that's Settings, Feature 3.2, and multi-currency is Roadmap). Use a hardcoded fallback (`'EUR'` or similar) until Settings exists; note this explicitly as a known temporary shortcut in your PR description so it doesn't get missed later.
- Validate at the boundary per `CLAUDE.md`: amount must parse to a positive number, category must be selected — everything else is optional. Don't add defensive checks beyond that.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] `src/lib/currency.ts` has thorough unit tests (parsing edge cases: empty string, negative, non-numeric, trailing decimals) since two other features will rely on it being correct.
- [ ] Create and edit flows both covered by RNTL tests.
- [ ] A spend created here is verifiable end-to-end against the real repository (integration test: create via the screen's save handler, read back via `SpendingRepository`, assert `source: 'manual'` and correct amount conversion).
- [ ] Verified in the iOS simulator: add a spend, see no crash, values round-trip correctly through the amount conversion.
