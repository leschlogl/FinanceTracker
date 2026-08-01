# Feature 3.2: Settings

**Status:** Not started
**Phase:** 3
**Depends on:** [0.1](00-data-layer-repositories.md), [1.1 Categories management](02-categories-management.md)

## Spec reference

`PRODUCT_SPEC.md` → Settings.

## Scope

- Replace the `src/app/settings.tsx` placeholder with the real settings screen: Currency, Language, Appearance, Manage categories (entry point), Export data to CSV.
- **Currency**: a picker for the user's home currency (a fixed reasonable list, e.g. major ISO 4217 codes — no need for all ~180). Persist the choice (see storage note below). This becomes the source of truth that Feature 1.2's hardcoded currency fallback should be replaced with — check whether 1.2 is done and update its fallback to read from here, or coordinate if you're building this first.
- **Language**: switch between `en`/`de` (the only two configured in `src/lib/locales/`), calling i18next's `changeLanguage`.
- **Appearance**: Light/Dark/System — NativeWind already respects system appearance automatically (verified working); this adds the manual override using NativeWind's `useColorScheme().setColorScheme` API (`colorScheme` npm package re-exported by `nativewind`, per `CLAUDE.md`'s design-system note).
- **Manage categories**: real navigation link to Feature 1.1's `src/app/categories.tsx` (replacing whatever temporary link 1.1 added, if any).
- **Export to CSV**: full spending history via the native share sheet (`expo-sharing` + writing a CSV string to a temp file via `expo-file-system`, or equivalent — check what's already installed before adding new deps).
- **Settings persistence**: currency/language/appearance choices need to persist across app restarts. There's no existing settings storage — decide between a small dedicated `settings` table via Drizzle (consistent with the rest of the app's persistence story) or `expo-sqlite`'s simpler `AsyncStorage`-equivalent for simple key-value data. Recommendation: a `settings` table, single row, via the same repository pattern (`SettingsRepository`) — keeps one persistence story instead of two, and this app already has SQLite wired up. If you choose differently, document why.

## Owns

- `src/features/settings/` — screen, currency/language/appearance controls, CSV export logic
- `src/data/settingsRepository.ts` (+ schema addition if you go the `settings`-table route — see schema note below)
- Rewrites: `src/app/settings.tsx`
- Extends: locale files, possibly `src/lib/currency.ts` (read home currency from settings instead of a hardcoded fallback)

## Do not touch

`src/app/categories.tsx` (1.1's actual screen) — only the link to it changes here, not the screen itself.

## Key implementation notes

- If a `settings` table is added, that's a schema change — same rule as Feature 2.2's note: this needs a new Drizzle migration (`npx drizzle-kit generate`), and is exactly the kind of thing worth flagging/coordinating on since multiple features may end up wanting schema changes around the same time (this one, and 2.2's recurring-expense-link field) — check `src/data/migrations/` for what's already there before generating, to avoid two agents generating conflicting migration files independently.
- Appearance persistence: NativeWind's `setColorScheme` affects the running app immediately, but on next cold start the app needs to read the saved preference and re-apply it before first render (similar to how migrations gate first render in `src/app/_layout.tsx`) — otherwise "Dark" selection wouldn't survive an app restart if the system is in Light mode.

## Acceptance criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] Settings persistence tested against the real repository pattern (better-sqlite3 + migration, per `CLAUDE.md`).
- [ ] Language switch verified to actually re-render existing screens with new strings (not just change a stored value).
- [ ] Appearance override verified in the simulator: set to Dark while system is Light (and vice versa), force-quit and relaunch, confirm it persisted (matches the same "relaunch to see it" caveat noted during initial dark-mode verification — live toggling mid-session may not repaint everything instantly, that's an acceptable known limitation, not a bug to chase).
- [ ] CSV export verified in the simulator: triggers the share sheet, exported file contains the expected rows/columns for seeded test data.
