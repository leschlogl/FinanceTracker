# Feature 0.2: Design-system primitives

**Status:** Not started
**Phase:** 0 (foundation, sequential)
**Depends on:** —

## Spec reference

`CLAUDE.md` → Design system section. No direct `PRODUCT_SPEC.md` section — this is infrastructure every screen-building feature needs.

## Scope

`Button` and `Text` already exist in `src/design-system/`. This adds the remaining primitives that Phase 1+ features will all need, so no feature has to invent its own version of a text input or a list card.

- `Input` — single-line text/number entry, label + optional error text, light/dark tokens, used by Add/Edit Spend (amount, merchant, note) and Categories (name).
- `Card` — a rounded, elevated (or bordered, keep it simple) container, used by Spendings list rows and Dashboard summary blocks.
- `Screen` — a thin wrapper combining `SafeAreaView` + the standard `bg-background dark:bg-backgroundDark` root className, so screens stop repeating that className by hand (see the three placeholder screens in `src/app/` — they'll be refactored to use this once it exists, but that refactor belongs to whichever feature next touches each screen, not this one).
- `IconButton` — SF Symbol icon + press target, used for things like "+ Add Spend" and delete actions.
- `EmptyState` — icon/text placeholder for empty lists (e.g. "No spendings yet"), used by Spendings list and Dashboard.

## Owns

- `src/design-system/Input.tsx`
- `src/design-system/Card.tsx`
- `src/design-system/Screen.tsx`
- `src/design-system/IconButton.tsx`
- `src/design-system/EmptyState.tsx`
- Extends: `src/design-system/index.ts` (barrel export additions only — don't remove existing exports)

## Do not touch

`src/design-system/Button.tsx`, `Text.tsx`, `tokens.ts` are done — extend by importing them, don't duplicate their logic.

## Key implementation notes

- Every component here follows the pattern already established in `Button.tsx`/`Text.tsx`: accepts `className` for call-site overrides, uses `dark:` variants from the existing token names in `tailwind.config.js` (`background`/`backgroundDark`, `surface`/`surfaceDark`, `text`/`textDark`, `textMuted`/`textMutedDark`, `primary`/`primaryDark`, `border`/`borderDark`) — don't invent new token names without adding them to `tailwind.config.js` and `src/design-system/tokens.ts` together.
- No feature logic here — these are dumb, reusable, presentation-only components. If a component starts needing feature-specific behavior (e.g. a category-aware picker), that belongs in the feature that needs it (see Feature 1.1's `CategoryPicker`), not here.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] At least one RNTL render test per component confirming it renders in both a default and an error/empty state where applicable.
- [ ] Visually spot-checked in the iOS simulator in both light and dark mode (a throwaway screen or Storybook-style route is fine for this, but don't leave scaffolding routes committed — verify then remove them).
