# Feature 0.1: Data layer repositories

**Status:** Not started
**Phase:** 0 (foundation, sequential — do this first, nothing else can safely start without it)
**Depends on:** —

## Spec reference

`CLAUDE.md` → Data layer section. `PRODUCT_SPEC.md` → Data model (conceptual).

## Scope

The schema (`src/data/schema.ts`), db client (`src/data/db.ts`), and migrations already exist. This feature adds the repository interfaces that `CLAUDE.md` mandates every feature depend on instead of touching Drizzle/SQLite directly, plus default category seeding.

- `SpendingRepository`: create, update, delete, list (by month, with optional category filter and free-text search across merchant/note — the Spendings list and Dashboard features both need this), get-by-id.
- `CategoryRepository`: create, update, delete (reassigning existing spends to "Other" per `PRODUCT_SPEC.md`), list.
- `RecurringExpenseRepository`: create, update, delete, list-active.
- Default category seeding: on first launch (no categories exist yet), insert the predefined set from `PRODUCT_SPEC.md` → Categories (Food, Transport, Shopping, Bills, Entertainment, Health, Other). Wire this into `src/app/_layout.tsx` right after migrations succeed, before rendering tabs.
- An `Other` category must always exist and be non-deletable through the repository layer (delete-reassignment target), even if the user renames the seeded one — simplest correct approach: seed it with a stable well-known id (e.g. `'other'`) and have `CategoryRepository.delete` reassign to that id, not by matching on name.

## Owns

- `src/data/spendingRepository.ts`
- `src/data/categoryRepository.ts`
- `src/data/recurringExpenseRepository.ts`
- `src/data/seedCategories.ts`
- `src/data/__tests__/spendingRepository.test.ts`, `categoryRepository.test.ts`, `recurringExpenseRepository.test.ts`, `seedCategories.test.ts`
- Extends: `src/app/_layout.tsx` (add the seed-categories call after migrations, before first render)

## Do not touch

`src/data/schema.ts`, `src/data/db.ts`, `src/data/migrations/**` are already done — if the schema genuinely needs to change for this feature, that's a sign the schema was under-specified; flag it rather than editing silently, since a schema change means a new migration and everyone downstream needs to know.

## Key implementation notes

- Repository interfaces live in TypeScript (plain interfaces, e.g. `interface SpendingRepository { create(input): Promise<Spending>; ... }`), implemented against `db` from `src/data/db.ts`. Feature code imports the interface type and a factory/instance, never `db` or `schema` directly (that's the whole point of the boundary — re-read `CLAUDE.md` → Data layer if the reasoning isn't clear).
- `amount` is stored in minor units (cents) per the comment in `schema.ts` — repositories pass that through as-is; conversion to/from a display-formatted string happens in UI code (later features), not here.
- `Spending.date` is `integer('date', { mode: 'timestamp' })`, so Drizzle gives you real `Date` objects — list-by-month should filter using JS `Date` range boundaries, not string comparison.
- Search (used by the Spendings list feature) should be a simple case-insensitive substring match on `merchant` and `note` — no need for a search index at this scale (personal, local data).

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Each repository has a test using the `better-sqlite3` + real-migration-SQL pattern from `src/data/__tests__/schema.test.ts`, covering create/read/update/delete and the category-delete-reassigns-to-Other behavior specifically.
- [ ] Seeding is idempotent — calling it twice (e.g. across app restarts) doesn't duplicate categories.
- [ ] `Other` category cannot be deleted (repository should reject or no-op, not throw an unhandled error a screen can't recover from).
