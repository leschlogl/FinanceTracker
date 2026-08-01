# CLAUDE.md — FinanceTracker Engineering Rules

This file defines how this codebase should be built and maintained. See `PRODUCT_SPEC.md` for what the app does; this file covers how it's built.

## Stack

- **Expo** — managed workflow, latest SDK
- **React Native** with **TypeScript** (`strict: true`)
- **Expo Router** for navigation (file-based routing under `src/app/`)
- **NativeWind** for styling (Tailwind utility classes on RN components)
- **Zustand** for client-side app state
- **expo-sqlite** + **drizzle-orm** for on-device persistence and migrations
- **i18next** + **expo-localization** for translations
- **iOS only for v1** — do not add Android-specific branching or config until explicitly requested

## Secrets & sensitive data

This repo is public on GitHub. **Never commit secrets, API keys, tokens, or credentials** — not in code, not in config, not in commit history. Concretely:

- Any API key (future: FX rate provider if it requires one, open banking aggregator, backend) goes in a gitignored `.env` file locally and in **EAS Secrets** / GitHub Actions secrets for CI, never hardcoded or checked in. `.gitignore` already excludes `.env*` and native credential files (`.p8`, `.p12`, `.mobileprovision`, `.jks`, `.keystore`) — keep it that way as new tooling gets added.
- Never store or transmit the user's bank/broker login credentials — reinforces the existing rule against unofficial bank APIs (see External account integrations below); CSV import and licensed aggregators are credential-free from this app's side by design.
- No real personal financial data, screenshots, or exports in the repo (tests/fixtures use synthetic data).
- If a secret is ever committed by mistake, it must be rotated, not just removed in a later commit — git history stays public.

## Data layer

All persistence goes through repository interfaces in `src/data/`, e.g. `SpendingRepository`, `CategoryRepository`. Feature code (screens, hooks, stores) depends only on these interfaces, never directly on `expo-sqlite` or Drizzle schema objects. The current implementation is local SQLite; this boundary is what lets iCloud sync or a backend (e.g. Supabase) be swapped in later without touching feature code. Don't build the swap now — just keep the seam clean.

**Multi-currency readiness**: `Spending` already stores its own `currency` per row (see `PRODUCT_SPEC.md`), so no breaking schema change is needed to add multi-currency later. When it lands, it's additive: an `ExchangeRate` cache table keyed by calendar date (date, base, target, rate), refreshed at most once per day on app foreground with graceful offline fallback to the last cached rate, plus a rate snapshot stored on each `Spending` at creation time (not a live reference) so historical totals stay stable regardless of later cache/API changes. Don't build these now — just don't design anything that would conflict with adding them later (e.g. don't assume a single global currency anywhere in business logic).

## Merchant categorization (future)

Phase 1 (dictionary + learned history) is plain TypeScript logic — no native code, works in Expo Go. Phase 2 (on-device Create ML/Core ML classifier, see `PRODUCT_SPEC.md`) needs an **Expo Development Build** (custom dev client via EAS Build) since Core ML isn't reachable from plain Expo Go — plan for that dependency when Phase 2 is picked up, don't add it speculatively now.

## Deep linking

Custom scheme: `financetracker://`. The URL contract (params, required vs optional) is documented in `PRODUCT_SPEC.md` under "ApplePay capture flow." If you change the contract, update both files in the same change.

## Formatting & i18n

- All user-facing strings go through i18next translation keys — no hardcoded copy in components.
- Currency display uses `Intl.NumberFormat` driven by the user's currency setting. No currency conversion in v1 — it's display formatting only.

## Testing

- Jest + React Native Testing Library for unit and component tests. Aim for high coverage on `data/` (repositories) and `lib/` (formatting, i18n, currency) — pure logic, cheap to test thoroughly.
- Snapshot tests are welcome for stable UI — design-system primitives, static screens/layouts. Avoid snapshotting anything containing dynamic dates or amounts; assert on specific rendered values there instead, since those snapshots just go stale/flaky.
- E2E/UI tests via **Maestro** — YAML flow files under `e2e/` covering core journeys (deep-link capture → confirm spend, add/edit/delete spend, dashboard render, settings changes). Maestro is the Expo-recommended E2E tool for managed workflow: no ejecting, runs against a built binary (simulator build via EAS Build).

## CI/CD

- **GitHub Actions** — required check on every push/PR: install, typecheck (`tsc --noEmit`), lint, Jest (unit + snapshot). Linux runner, no native build needed, fast.
- **EAS Build + EAS Workflows** — builds an iOS simulator binary and runs the Maestro E2E suite against it. Preferred over a GitHub Actions macOS runner (cheaper, faster, Expo-native). Runs on merges to `main` and before releases, not on every commit, since it's the expensive step.

## Lint & format

- ESLint (Expo config) + Prettier, run before commit.

## Design system

Reusable UI lives in `src/design-system/` — primitives (Button, Text, Input, Card, etc.) and design tokens (colors, spacing, typography), built on top of NativeWind. Feature screens compose these rather than styling raw RN primitives inline, so the app looks consistent across screens (dashboard, lists, settings, onboarding). Keep it a folder within the app, not a separate package — there's no second consumer to justify that.

Color tokens are defined for both light and dark, using NativeWind's `dark:` variant — never a hardcoded color in a component. Follows the OS appearance by default, with a manual Light/Dark/System override in Settings (see `PRODUCT_SPEC.md`).

## Folder structure

```
src/
  app/            # Expo Router routes (screens)
  data/           # repository interfaces + SQLite implementation, Drizzle schema
  design-system/  # primitives + tokens (see above)
  features/<name>/# feature-scoped components, hooks, stores
  components/     # shared components composed from the design system, not tied to one feature
  lib/            # cross-cutting utilities (formatting, i18n setup, etc.)
```

## External account integrations (future)

Investments/account-linking is a roadmap item (see `PRODUCT_SPEC.md`) — not built yet. Prefer CSV import over direct bank/broker API integration when it's picked up.

## Coding conventions

- No speculative abstractions — build what the current feature needs, not what a future one might.
- No dead or commented-out code left in the tree.
- Comments only when the WHY isn't obvious from the code (a hidden constraint, a workaround, a non-obvious invariant) — never comments that restate what the code does.
- Trust internal invariants; only validate/guard at real boundaries (user input, deep link params, external data) — not defensively everywhere.
- Prefer editing existing files over creating new ones; don't fragment logic across extra files without reason.
