import type { RecurringExpense } from '@/data/recurringExpenseRepository';
import type { Spending } from '@/data/spendingRepository';

import { buildRecurringNoteMarker, computeSpendingsToGenerate } from '../generation';

function recurringExpense(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 're-1',
    name: 'Rent',
    amount: 120000,
    categoryId: 'bills',
    dayOfMonth: 1,
    active: true,
    ...overrides,
  };
}

let nextSpendingId = 1;

function generatedSpending(
  overrides: Partial<Spending> & { recurringExpenseId: string },
): Spending {
  const { recurringExpenseId, ...rest } = overrides;

  return {
    id: `spend-${nextSpendingId++}`,
    amount: 120000,
    currency: 'EUR',
    merchant: 'Rent',
    categoryId: 'bills',
    date: new Date(2026, 0, 1),
    note: buildRecurringNoteMarker(recurringExpenseId),
    source: 'recurring',
    ...rest,
  };
}

describe('computeSpendingsToGenerate', () => {
  it('generates a first-ever spend once the day of month has arrived', () => {
    const re = recurringExpense({ dayOfMonth: 15 });
    const now = new Date(2026, 7, 15); // Aug 15 2026

    const result = computeSpendingsToGenerate([re], [], now);

    expect(result).toEqual([
      {
        amount: 120000,
        currency: 'EUR',
        merchant: 'Rent',
        categoryId: 'bills',
        date: new Date(2026, 7, 15),
        note: buildRecurringNoteMarker('re-1'),
        source: 'recurring',
      },
    ]);
  });

  it('does not generate before the day of month has arrived this month', () => {
    const re = recurringExpense({ dayOfMonth: 20 });
    const now = new Date(2026, 7, 15); // Aug 15 2026, day 20 hasn't happened yet

    expect(computeSpendingsToGenerate([re], [], now)).toEqual([]);
  });

  it('does not generate a duplicate when this period was already generated', () => {
    const re = recurringExpense({ dayOfMonth: 1 });
    const now = new Date(2026, 7, 15); // Aug 15 2026
    const existing = [
      generatedSpending({ recurringExpenseId: 're-1', date: new Date(2026, 7, 1) }),
    ];

    expect(computeSpendingsToGenerate([re], existing, now)).toEqual([]);
  });

  it('uses the recurring expense current amount for the next generation, leaving the past spend untouched', () => {
    // Rent was 1000.00 when generated in July; it was increased to 1200.00
    // since (the rent-increase scenario from PRODUCT_SPEC.md).
    const re = recurringExpense({ dayOfMonth: 1, amount: 120000 });
    const now = new Date(2026, 7, 15); // Aug 15 2026
    const pastSpend = generatedSpending({
      recurringExpenseId: 're-1',
      date: new Date(2026, 6, 1), // July 1, generated at the old amount
      amount: 100000,
    });

    const result = computeSpendingsToGenerate([re], [pastSpend], now);

    // The already-generated July spend is a saved row this function never
    // reads back out or mutates — only the newly computed August spend is
    // returned, and it reflects the recurring expense's *current* amount.
    expect(result).toEqual([
      expect.objectContaining({ amount: 120000, date: new Date(2026, 7, 1) }),
    ]);
    expect(pastSpend.amount).toBe(100000);
  });

  it('backfills every missed month since the last generation, not just the most recent', () => {
    const re = recurringExpense({ dayOfMonth: 1 });
    const now = new Date(2026, 7, 15); // Aug 15 2026 — app not opened since April
    const existing = [
      generatedSpending({ recurringExpenseId: 're-1', date: new Date(2026, 3, 1) }),
    ]; // April 1

    const result = computeSpendingsToGenerate([re], existing, now);

    expect(result.map((s) => s.date)).toEqual([
      new Date(2026, 4, 1), // May
      new Date(2026, 5, 1), // June
      new Date(2026, 6, 1), // July
      new Date(2026, 7, 1), // August
    ]);
  });

  it('does not backfill before "now" on first-ever generation, even if the recurring expense could have existed earlier', () => {
    // No prior generated spend at all — computeSpendingsToGenerate has no
    // creation timestamp to anchor a backfill start to, so it only considers
    // the current period (see the doc comment in generation.ts).
    const re = recurringExpense({ dayOfMonth: 1 });
    const now = new Date(2026, 7, 15); // Aug 15 2026

    const result = computeSpendingsToGenerate([re], [], now);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual(new Date(2026, 7, 1));
  });

  it('clamps the generation day to the last day of shorter months', () => {
    const re = recurringExpense({ dayOfMonth: 31 });
    // April 5 2026 — Jan/Feb/March are fully elapsed; April (30 days, day
    // clamped to 30) isn't due yet since "now" is only the 5th.
    const now = new Date(2026, 3, 5);
    const existing = [
      generatedSpending({ recurringExpenseId: 're-1', date: new Date(2025, 11, 31) }), // Dec 31 2025
    ];

    const result = computeSpendingsToGenerate([re], existing, now);

    expect(result.map((s) => s.date)).toEqual([
      new Date(2026, 0, 31), // Jan
      new Date(2026, 1, 28), // Feb, clamped from 31 -> 28 (2026 is not a leap year)
      new Date(2026, 2, 31), // March
    ]);
  });

  it('skips inactive recurring expenses', () => {
    const re = recurringExpense({ active: false, dayOfMonth: 1 });
    const now = new Date(2026, 7, 15);

    expect(computeSpendingsToGenerate([re], [], now)).toEqual([]);
  });

  it('handles multiple recurring expenses independently', () => {
    const rent = recurringExpense({ id: 're-rent', name: 'Rent', dayOfMonth: 1 });
    const gym = recurringExpense({ id: 're-gym', name: 'Gym', dayOfMonth: 25, amount: 3000 });
    const now = new Date(2026, 7, 15); // Aug 15 2026 — rent (day 1) is due, gym (day 25) is not yet

    const result = computeSpendingsToGenerate([rent, gym], [], now);

    expect(result).toEqual([expect.objectContaining({ merchant: 'Rent' })]);
  });

  it('matches the note marker by exact id, not substring, so similar ids never cross-match', () => {
    const re = recurringExpense({ id: 're-1', dayOfMonth: 1 });
    const now = new Date(2026, 7, 15);
    // A generated spend for a *different* recurring expense whose id happens
    // to contain 're-1' as a substring — must not be mistaken for re-1's own
    // generated spend.
    const existing = [
      generatedSpending({ recurringExpenseId: 're-11', date: new Date(2026, 7, 1) }),
    ];

    const result = computeSpendingsToGenerate([re], existing, now);

    expect(result).toEqual([expect.objectContaining({ note: buildRecurringNoteMarker('re-1') })]);
  });
});
