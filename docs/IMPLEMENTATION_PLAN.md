# FinanceTracker — Implementation Plan

This is the coordination reference for building the v1 features described in `PRODUCT_SPEC.md`, broken into discrete units of work small enough for one agent (human or AI) to complete independently. It exists specifically to let multiple agents work on this codebase — sequentially or in parallel — without stepping on each other or re-deriving decisions that are already made.

Read `CLAUDE.md` (how the codebase is built) and `PRODUCT_SPEC.md` (what the app does) before this file — this file assumes both as given context and doesn't repeat them.

## How to use this file if you're an agent picking up work

1. Read `CLAUDE.md` and `PRODUCT_SPEC.md` first, then this file, then your assigned feature file under `docs/features/`.
2. Check the feature file's **Depends on** list. If a dependency isn't marked Done in the status table below, either pick a different feature or build the dependency first.
3. Only touch files listed under that feature's **Owns** section, plus files it explicitly says to extend (e.g. adding a route to a shared layout). If you find you need to touch something outside that boundary, stop and reconcile — either the plan is missing a dependency or the boundary needs adjusting, but don't just silently expand scope into another feature's territory.
4. Implement, then run through the feature's **Acceptance criteria** — this always includes `npm run typecheck`, `npm run lint`, and `npm test` at minimum, plus feature-specific checks.
5. Update the feature file's **Status** field and the status table below when done.

## Working in parallel

Features in the same phase with no dependency on each other can be built in parallel. To do that safely:

- Each feature gets its own branch (`feature/<feature-slug>`, matching the feature file name).
- If running multiple agents concurrently against this repo, give each one an isolated git worktree (or the Agent tool's `isolation: "worktree"` option) rather than sharing a working directory — avoids one agent's uncommitted changes leaking into another's.
- Integrate via PR into `main`, one feature at a time. Don't merge two in-flight feature branches into each other directly — merge each into `main` once its acceptance criteria pass, and rebase siblings on top if needed.
- The **Owns** boundaries in each feature file are what make parallel work safe — if two features in the same phase claim overlapping files, that's a planning bug; fix the plan before starting either.

## Phases and dependency graph

Phase 0 is strictly sequential and blocks everything else. Within later phases, only build in parallel what the dependency graph actually allows — don't assume a whole phase is parallel just because it's numbered together.

```
Phase 0 (sequential, foundation)
  0.1 Data layer repositories ──┬─────────────────────────────────────┐
  0.2 Design-system primitives ─┘                                     │
                                                                       │
Phase 1 (core spend tracking)                                        │
  1.1 Categories management ◄───────────────────────────────────────┘
      │
      ├─► 1.2 Manual spend entry (Confirm Spend screen)
      │        │
      │        ├─► 1.3 Spendings list (soft dep: edit needs 1.2's screen route)
      │        │
Phase 2 (capture & automation)
      │        ├─► 2.1 Apple Pay Shortcuts capture (reuses 1.2's screen)
      │
      └────────┴─► 2.2 Recurring expenses (needs 1.1's category picker)

Phase 3 (dashboard & settings) — both depend on 0.1 + 1.1 only, parallel with each other
  3.1 Dashboard (current month + yearly)
  3.2 Settings (currency, language, appearance, manage categories, CSV export)

Phase 4 — Roadmap items (Budget/Income, Investments, Multi-currency, Merchant
categorization, Auto recurring-detection). Not detailed here — see PRODUCT_SPEC.md
Roadmap section. Don't start these until explicitly requested, same rule as always.
```

## Status table

| # | Feature | Phase | Depends on | Status |
|---|---------|-------|------------|--------|
| 0.1 | [Data layer repositories](features/00-data-layer-repositories.md) | 0 | — | Done ([#2](https://github.com/leschlogl/FinanceTracker/pull/2)) |
| 0.2 | [Design-system primitives](features/01-design-system-primitives.md) | 0 | — | Done ([#1](https://github.com/leschlogl/FinanceTracker/pull/1)) |
| 1.1 | [Categories management](features/02-categories-management.md) | 1 | 0.1, 0.2 | Not started |
| 1.2 | [Manual spend entry](features/03-manual-spend-entry.md) | 1 | 0.1, 0.2, 1.1 | Not started |
| 1.3 | [Spendings list](features/04-spendings-list.md) | 1 | 0.1, 0.2, 1.2 (soft) | Not started |
| 2.1 | [Apple Pay Shortcuts capture](features/05-applepay-shortcuts-capture.md) | 2 | 1.2 | Not started |
| 2.2 | [Recurring expenses](features/06-recurring-expenses.md) | 2 | 0.1, 1.1 | Not started |
| 3.1 | [Dashboard](features/07-dashboard.md) | 3 | 0.1, 1.1 | Not started |
| 3.2 | [Settings](features/08-settings.md) | 3 | 0.1, 1.1 | Not started |

Keep this table in sync with each feature file's own Status field — the table is for at-a-glance scanning, the feature file is the source of truth if they ever disagree.

## Conventions that apply to every feature (not repeated in each file)

- Follow `CLAUDE.md` exactly: repository pattern for persistence, NativeWind with light/dark tokens, i18n keys for all copy (no hardcoded strings), no speculative abstractions.
- New i18n keys go in both `src/lib/locales/en.json` and `src/lib/locales/de.json` — a PR that adds an English string without the German counterpart is incomplete.
- New shared UI goes in `src/design-system/`; feature-specific UI goes in `src/features/<feature>/`.
- Every feature that touches persistence writes its tests against the pattern in `src/data/__tests__/schema.test.ts` (better-sqlite3 + the real generated migration SQL, not expo-sqlite, since that can't run under Jest).
- Every feature that adds a screen adds at least one RNTL render test following `src/app/__tests__/index.test.tsx`'s pattern (note `render()` is async in the installed `@testing-library/react-native` version — `await render(...)`).
