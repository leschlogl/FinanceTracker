# Feature 1.1: Categories management

**Status:** Not started
**Phase:** 1
**Depends on:** [0.1 Data layer repositories](00-data-layer-repositories.md), [0.2 Design-system primitives](01-design-system-primitives.md)

## Spec reference

`PRODUCT_SPEC.md` → Categories, Settings ("Manage categories").

## Scope

- A categories list/management screen: view all categories, add new, rename, recolor, delete (delete reassigns existing spends to "Other" — this is a `CategoryRepository` behavior already built in 0.1, this feature just calls it and reflects the result in the UI).
- `Other` cannot be deleted from the UI (repository already enforces this — the UI should just not render a delete action for it, rather than show an error after the fact).
- A `CategoryPicker` component: given the current categories, lets the user pick one. This is the piece Feature 1.2 (manual spend entry) and Feature 2.2 (recurring expenses) both depend on — build it as a standalone, reusable component from the start, not as something buried inside the management screen.
- This screen isn't reachable from the tab bar directly per `PRODUCT_SPEC.md` (it's surfaced from Settings) — for now, since Settings (3.2) doesn't exist yet, add a temporary route (e.g. `src/app/categories.tsx`) reachable via a direct link from the Settings placeholder screen's existing text, OR coordinate with whoever picks up Feature 3.2 to wire the real entry point then. Note whichever you choose in this file's Status update so 3.2 doesn't duplicate the screen.

## Owns

- `src/features/categories/` — screen(s), any category-specific hooks/components
- `src/design-system/CategoryPicker.tsx` (lives in design-system since it's shared across features, even though it's category-domain-aware — flag in review if this feels like the wrong home, but don't invent a third location without discussion)
- `src/app/categories.tsx` (route)
- Extends: `src/app/settings.tsx` (temporary link to the categories route, see above), `src/lib/locales/en.json` / `de.json` (new `categories.*` keys)

## Do not touch

`src/data/categoryRepository.ts` (0.1's territory — if the repository is missing a method you need, that's a signal 0.1 was under-specified; add the method there in a small, clearly-scoped follow-up rather than reaching around the boundary from here).

## Key implementation notes

- Category `color` is stored as a hex string (see `schema.ts`) — a simple preset color swatch picker (8-10 predefined colors) is enough for v1, no need for a full color picker UI.
- Category `icon` — reuse whatever icon convention Feature 0.2's `IconButton`/SF Symbol usage established; keep it to a curated preset list rather than free text input, so there's no invalid-icon-name failure mode later.
- Use `Input` and `Card` from `src/design-system/` (Feature 0.2) rather than raw `TextInput`/`View`.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Add/rename/recolor/delete all covered by RNTL tests against a mocked/test `CategoryRepository`, not the real SQLite path (unit-test the screen logic; the repository itself is already tested in 0.1).
- [ ] Deleting a category with existing spends reassigns them to Other and this is verified in a test (can be an integration-style test using the real repository + better-sqlite3, per the pattern in `CLAUDE.md`).
- [ ] `CategoryPicker` has its own render test independent of the management screen, since two other features will import it directly.
- [ ] Verified in the iOS simulator, light and dark.
