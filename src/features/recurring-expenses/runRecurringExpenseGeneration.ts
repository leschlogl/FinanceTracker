import {
  getRecurringExpenseRepository,
  type RecurringExpenseRepository,
} from '@/data/recurringExpenseRepository';
import {
  getSpendingRepository,
  type Spending,
  type SpendingRepository,
} from '@/data/spendingRepository';

import { computeSpendingsToGenerate } from './generation';

// SpendingRepository.list() only queries one (year, month) at a time — there's
// no "all spendings ever" query — and RecurringExpense has no creation
// timestamp to bound how far back generation could possibly need to look (see
// generation.ts's doc comment on first-ever generation). 24 months is a
// pragmatic cap: a recurring expense whose last generated spend is older than
// that would mean the app went unopened for 2 years straight, which is far
// beyond what this feature needs to handle gracefully, and it keeps this
// foreground/startup query bounded rather than unbounded.
const LOOKBACK_MONTHS = 24;

async function fetchRecentSpendings(
  repository: SpendingRepository,
  now: Date,
): Promise<Spending[]> {
  const monthsToFetch: { year: number; month: number }[] = [];

  for (let i = 0; i < LOOKBACK_MONTHS; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsToFetch.push({ year: monthDate.getFullYear(), month: monthDate.getMonth() + 1 });
  }

  const monthlyResults = await Promise.all(
    monthsToFetch.map(({ year, month }) => repository.list({ year, month })),
  );

  return monthlyResults.flat();
}

/**
 * App-lifecycle glue around the pure `computeSpendingsToGenerate` logic:
 * loads active recurring expenses + recent spendings from the real
 * repositories, computes what's due, and persists it. Called from
 * `src/app/_layout.tsx` on app foreground, sequenced after category seeding
 * — a recurring expense's `categoryId` must already exist before a generated
 * spend referencing it can be inserted.
 */
export async function runRecurringExpenseGeneration(
  recurringExpenseRepository: RecurringExpenseRepository = getRecurringExpenseRepository(),
  spendingRepository: SpendingRepository = getSpendingRepository(),
  now: Date = new Date(),
): Promise<void> {
  const recurringExpenses = await recurringExpenseRepository.listActive();

  if (recurringExpenses.length === 0) {
    return;
  }

  const existingSpendings = await fetchRecentSpendings(spendingRepository, now);
  const toGenerate = computeSpendingsToGenerate(recurringExpenses, existingSpendings, now);

  for (const input of toGenerate) {
    await spendingRepository.create(input);
  }
}
