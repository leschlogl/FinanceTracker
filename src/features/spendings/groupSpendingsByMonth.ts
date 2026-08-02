import type { Spending } from '@/data/spendingRepository';

export interface SpendingMonthSection {
  /** Sortable/unique key for the month, e.g. "2026-08". */
  key: string;
  year: number;
  /** 1-12 */
  month: number;
  data: Spending[];
}

/**
 * Groups spendings by calendar month (derived from each Spending.date, a
 * real JS Date per src/data/spendingRepository.ts) into sections ordered
 * most-recent month first, with each section's spendings ordered
 * most-recent first too. Pure and independent of how the spendings were
 * fetched, so it's cheap to unit test in isolation, per
 * docs/features/04-spendings-list.md's acceptance criteria.
 */
export function groupSpendingsByMonth(spendings: Spending[]): SpendingMonthSection[] {
  const sectionsByKey = new Map<string, SpendingMonthSection>();

  for (const spending of spendings) {
    const year = spending.date.getFullYear();
    const month = spending.date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    let section = sectionsByKey.get(key);
    if (!section) {
      section = { key, year, month, data: [] };
      sectionsByKey.set(key, section);
    }
    section.data.push(spending);
  }

  const sections = [...sectionsByKey.values()].sort((a, b) => (a.key < b.key ? 1 : -1));

  for (const section of sections) {
    section.data.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return sections;
}
