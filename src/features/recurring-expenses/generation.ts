import type { RecurringExpense } from '@/data/recurringExpenseRepository';
import type { CreateSpendingInput, Spending } from '@/data/spendingRepository';

/**
 * KNOWN SCHEMA GAP — see docs/features/06-recurring-expenses.md ("Do not
 * touch" section) and this feature's final report/PR description for the
 * full write-up. `Spending` has no column linking a generated row back to
 * the `RecurringExpense` that produced it, which is what idempotent
 * generation (don't create a second spend for a period already generated)
 * really wants. The clean fix is a schema change:
 *
 *   add `recurringExpenseId: text('recurring_expense_id').references(() =>
 *   recurringExpenses.id)`, nullable, on `spendings`, plus a migration.
 *
 * That's out of scope here per this feature's "Do not touch src/data/schema.ts"
 * instruction (a schema change needs a coordinated migration and affects
 * every other feature that reads `Spending` rows) — flagged for Feature 0.1
 * rather than worked around silently.
 *
 * Stopgap used instead, until that column exists: every recurring-generated
 * spend's `note` is set to an exact marker string encoding the recurring
 * expense id (`buildRecurringNoteMarker` / `wasGeneratedFrom` below), and
 * "was this period already generated for this recurring expense" is answered
 * by scanning existing spends for `source === 'recurring'` and that exact
 * marker. Known imperfections, accepted deliberately for now:
 *  - the marker occupies the entire `note` field, so a recurring-generated
 *    spend can't also carry a free-text note without breaking the marker
 *    (which would defeat future duplicate-detection for that one row),
 *  - a user editing that note by hand (e.g. from the Confirm Spend edit
 *    screen) also breaks matching for that row, risking a duplicate on the
 *    next generation run,
 *  - matching by exact string equality (not substring) at least avoids one
 *    failure mode — one recurring expense's id being a substring of
 *    another's never causes a false match.
 * All of this goes away once the real `recurringExpenseId` column exists.
 */
const RECURRING_NOTE_MARKER_PREFIX = 'recurring-expense-id:';

export function buildRecurringNoteMarker(recurringExpenseId: string): string {
  return `${RECURRING_NOTE_MARKER_PREFIX}${recurringExpenseId}`;
}

function wasGeneratedFrom(
  spending: Pick<Spending, 'source' | 'note'>,
  recurringExpenseId: string,
): boolean {
  return (
    spending.source === 'recurring' &&
    spending.note === buildRecurringNoteMarker(recurringExpenseId)
  );
}

// RecurringExpense has no `currency` field (schema.ts and PRODUCT_SPEC.md's
// conceptual data model both omit it) — mirrors the same temporary fallback
// src/features/spendings/ConfirmSpendScreen.tsx uses until Settings (Feature
// 3.2) provides the user's configured currency. Exported so the CRUD screen
// and generation glue in this feature folder share one value rather than
// each hardcoding 'EUR' separately.
export const DEFAULT_CURRENCY_FALLBACK = 'EUR';

export type SpendingInput = CreateSpendingInput;

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Clamps `dayOfMonth` to the last real day of a shorter month (e.g. 31 -> Feb 28/29). */
function clampedDay(year: number, monthIndex0: number, dayOfMonth: number): number {
  return Math.min(dayOfMonth, daysInMonth(year, monthIndex0));
}

/** Monotonic integer key for a (year, 0-indexed month) pair, for range iteration/comparison. */
function monthKey(year: number, monthIndex0: number): number {
  return year * 12 + monthIndex0;
}

/**
 * Pure generation logic — no I/O, no repositories — per
 * docs/features/06-recurring-expenses.md's "Key implementation notes", which
 * asks for exactly this shape so the date-boundary logic is unit-testable
 * without touching SQLite or app lifecycle.
 *
 * Precise trigger/backfill rules (stated explicitly, per the feature doc's
 * request, since this is the easiest part of the feature to get subtly
 * wrong):
 *
 *  - Cadence is monthly, keyed by calendar month + `dayOfMonth` (clamped to
 *    the last day of shorter months — day 31 generates on Feb 28/29).
 *  - A given calendar month is "due" once `now`'s day-of-month is >= that
 *    month's clamped `dayOfMonth`; every fully-elapsed past month is always
 *    due (its day-of-month has necessarily already passed).
 *  - Backfill: if a recurring expense already has a generated spend, this
 *    fills every calendar month from the one after that through the current
 *    due period — so if the app isn't opened for N months, it backfills up
 *    to N missed spends on the next open rather than silently losing that
 *    history. This is the explicit product decision called for by the
 *    feature doc ("per spec's spirit backfilling makes sense so history
 *    isn't silently missing").
 *  - First-ever generation for a recurring expense does NOT backfill before
 *    `now`: `RecurringExpense` has no creation timestamp in the schema (a
 *    second, smaller gap alongside the one above), so there's no reliable
 *    way to know how far back a brand-new recurring expense "should" have
 *    existed. Only the current period is considered, generated once its
 *    `dayOfMonth` arrives — this avoids inventing history the user never
 *    actually had.
 *  - Editing a recurring expense's amount only affects future generations:
 *    this falls out naturally here, since generation always reads the
 *    recurring expense's *current* `amount`, and already-generated spends
 *    are independent saved rows this function never touches or re-reads.
 *  - Inactive recurring expenses are skipped (defensive — callers are
 *    expected to already pass only `listActive()` results, but this
 *    function doesn't rely on that).
 */
export function computeSpendingsToGenerate(
  recurringExpenses: RecurringExpense[],
  existingSpendings: Spending[],
  now: Date,
): SpendingInput[] {
  const currentMonthKey = monthKey(now.getFullYear(), now.getMonth());
  const result: SpendingInput[] = [];

  for (const recurringExpense of recurringExpenses) {
    if (!recurringExpense.active) {
      continue;
    }

    const generatedMonthKeys = existingSpendings
      .filter((spending) => wasGeneratedFrom(spending, recurringExpense.id))
      .map((spending) => monthKey(spending.date.getFullYear(), spending.date.getMonth()));

    const lastGeneratedMonthKey =
      generatedMonthKeys.length > 0 ? Math.max(...generatedMonthKeys) : undefined;
    const startMonthKey =
      lastGeneratedMonthKey === undefined ? currentMonthKey : lastGeneratedMonthKey + 1;

    for (let candidateKey = startMonthKey; candidateKey <= currentMonthKey; candidateKey++) {
      const year = Math.floor(candidateKey / 12);
      const monthIndex0 = candidateKey % 12;
      const day = clampedDay(year, monthIndex0, recurringExpense.dayOfMonth);
      const due = candidateKey < currentMonthKey || now.getDate() >= day;

      if (!due) {
        continue;
      }

      result.push({
        amount: recurringExpense.amount,
        currency: DEFAULT_CURRENCY_FALLBACK,
        merchant: recurringExpense.name,
        categoryId: recurringExpense.categoryId,
        date: new Date(year, monthIndex0, day),
        note: buildRecurringNoteMarker(recurringExpense.id),
        source: 'recurring',
      });
    }
  }

  return result;
}
