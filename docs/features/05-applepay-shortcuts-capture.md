# Feature 2.1: Apple Pay Shortcuts capture

**Status:** Done ([PR #7](https://github.com/leschlogl/FinanceTracker/pull/7)) — merged. Onboarding content verified against the real Shortcuts app on iOS 26.5 plus Apple's docs (trigger is "Wallet" on iOS 26+, was "Transaction" before). Two real findings during review, see `docs/IMPLEMENTATION_PLAN.md`'s "Known cross-cutting issues": the `NativeTabs` routing bug this surfaced (fixed separately on `main`), and the still-open `source: 'shortcut'` attribution gap (needs a product decision, not fixed here).
**Phase:** 2
**Depends on:** [1.2 Manual spend entry](03-manual-spend-entry.md) (reuses its Confirm Spend screen)

## Spec reference

`PRODUCT_SPEC.md` → ApplePay capture flow (this is the whole section — read it in full, the deep link contract and the "why" for the Shortcuts-based approach matter here). `CLAUDE.md` → Deep linking.

## Scope

- Handle the `financetracker://add-spend?amount=&merchant=&currency=` deep link (scheme already configured in `app.json`). Use `expo-linking` / Expo Router's deep link handling to route it to the Confirm Spend screen (from 1.2) with the params pre-filled, `source: 'shortcut'` on save.
- All params are optional/best-effort per spec — the screen must work correctly with zero, some, or all params present. This should require no changes to 1.2's screen if 1.2 built it generically as instructed; if it turns out changes are needed there, that's small and expected, just don't duplicate the screen.
- Onboarding screen: step-by-step instructions for creating the "Apple Pay Transaction" Personal Automation in Shortcuts, since the app can't configure this for the user. Static content (text + maybe illustrations), no dynamic logic. Reachable from Settings (coordinate placement with Feature 3.2, same situation as 1.1's categories screen — use a temporary link from the Settings placeholder if 3.2 isn't done yet).

## Owns

- `src/app/onboarding-shortcuts.tsx` (or under `src/features/onboarding/` if it grows beyond one screen — your call)
- Deep link routing logic (likely just Expo Router's file-based convention picking up `add-spend` params automatically via `src/app/add-spend.tsx`'s existing route from 1.2 — confirm whether any extra wiring is needed in `src/app/_layout.tsx` beyond what Expo Router does by default, and only touch `_layout.tsx` if it's genuinely required)
- Extends: `src/app/settings.tsx` (temporary link to onboarding), locale files

## Do not touch

`src/features/spendings/ConfirmSpendScreen.tsx`, `src/app/add-spend.tsx` (1.2's) beyond what's strictly necessary to accept deep link params — if the screen already accepts initial values generically as 1.2 was instructed to build it, you likely don't need to touch these files at all.

## Key implementation notes

- Don't trust deep link params as final values — per spec, they're pre-fill hints only; the user always confirms before saving. Make sure `source: 'shortcut'` is set correctly and isn't overridable by a malformed/malicious deep link param (i.e. don't read `source` from the URL at all, hardcode it in this feature's routing logic).
- Test the deep link manually via `xcrun simctl openurl booted "financetracker://add-spend?amount=12.99&merchant=REWE"` against a running simulator build — this is the realistic way to verify without actually setting up Shortcuts.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Tests cover: deep link with all params, with no params, with partial params — Confirm Spend screen renders sensibly in each case.
- [ ] Manually verified via `xcrun simctl openurl` against the simulator (paste the exact command and result in the PR description).
- [ ] Onboarding screen content reviewed for accuracy against the actual current Shortcuts app UI (screenshots/steps can go stale across iOS versions — note the iOS version you verified against).
