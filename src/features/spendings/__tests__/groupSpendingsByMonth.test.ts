import type { Spending } from '@/data/spendingRepository';

import { groupSpendingsByMonth } from '../groupSpendingsByMonth';

function makeSpending(overrides: Partial<Spending> & { date: Date }): Spending {
  return {
    id: 'id',
    amount: 100,
    currency: 'EUR',
    merchant: 'Merchant',
    categoryId: 'food',
    note: null,
    source: 'manual',
    ...overrides,
  };
}

describe('groupSpendingsByMonth', () => {
  it('returns an empty array for no spendings', () => {
    expect(groupSpendingsByMonth([])).toEqual([]);
  });

  it('groups spendings into one section per calendar month', () => {
    const spendings = [
      makeSpending({ id: '1', date: new Date(2026, 7, 5) }),
      makeSpending({ id: '2', date: new Date(2026, 7, 20) }),
      makeSpending({ id: '3', date: new Date(2026, 6, 15) }),
    ];

    const sections = groupSpendingsByMonth(spendings);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ year: 2026, month: 8 });
    expect(sections[0].data.map((s) => s.id)).toEqual(['2', '1']);
    expect(sections[1]).toMatchObject({ year: 2026, month: 7 });
    expect(sections[1].data.map((s) => s.id)).toEqual(['3']);
  });

  it('orders sections most-recent month first, across year boundaries', () => {
    const spendings = [
      makeSpending({ id: 'jan', date: new Date(2026, 0, 1) }),
      makeSpending({ id: 'dec', date: new Date(2025, 11, 15) }),
      makeSpending({ id: 'feb', date: new Date(2026, 1, 1) }),
    ];

    const sections = groupSpendingsByMonth(spendings);

    expect(sections.map((s) => s.key)).toEqual(['2026-02', '2026-01', '2025-12']);
  });

  it('orders spendings within a section most-recent first', () => {
    const spendings = [
      makeSpending({ id: 'early', date: new Date(2026, 7, 1) }),
      makeSpending({ id: 'late', date: new Date(2026, 7, 28) }),
      makeSpending({ id: 'mid', date: new Date(2026, 7, 15) }),
    ];

    const sections = groupSpendingsByMonth(spendings);

    expect(sections[0].data.map((s) => s.id)).toEqual(['late', 'mid', 'early']);
  });
});
