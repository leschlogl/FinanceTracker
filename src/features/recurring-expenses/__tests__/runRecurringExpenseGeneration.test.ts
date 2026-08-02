import type {
  CreateRecurringExpenseInput,
  RecurringExpense,
  RecurringExpenseRepository,
  UpdateRecurringExpenseInput,
} from '@/data/recurringExpenseRepository';
import type {
  CreateSpendingInput,
  ListSpendingsParams,
  Spending,
  SpendingRepository,
  UpdateSpendingInput,
} from '@/data/spendingRepository';

import { buildRecurringNoteMarker } from '../generation';
import { runRecurringExpenseGeneration } from '../runRecurringExpenseGeneration';

// In-memory fakes standing in for the real (SQLite-backed) repositories, same
// approach as src/features/categories/__tests__/CategoriesScreen.test.tsx —
// this test is about the wiring (which repository calls happen, in what
// order, bounded to how much history) not the generation math itself, which
// is already covered thoroughly and in isolation by generation.test.ts.
function createFakeRecurringExpenseRepository(
  initial: RecurringExpense[],
): RecurringExpenseRepository {
  const items = [...initial];

  return {
    async create(input: CreateRecurringExpenseInput) {
      throw new Error(`not needed for this test: ${JSON.stringify(input)}`);
    },
    async update(_id: string, _input: UpdateRecurringExpenseInput): Promise<RecurringExpense> {
      throw new Error('not needed for this test');
    },
    async delete() {
      throw new Error('not needed for this test');
    },
    async listActive() {
      return items.filter((item) => item.active);
    },
  };
}

function createFakeSpendingRepository(initial: Spending[]) {
  const items = [...initial];
  const listCalls: ListSpendingsParams[] = [];

  const repository: SpendingRepository = {
    async create(input: CreateSpendingInput) {
      const created: Spending = {
        id: `new-${items.length + 1}`,
        ...input,
        merchant: input.merchant ?? null,
        note: input.note ?? null,
      };
      items.push(created);
      return created;
    },
    async update(_id: string, _input: UpdateSpendingInput) {
      throw new Error('not needed for this test');
    },
    async delete() {
      throw new Error('not needed for this test');
    },
    async getById() {
      return null;
    },
    async list({ year, month }: ListSpendingsParams) {
      listCalls.push({ year, month });
      return items.filter(
        (spending) =>
          spending.date.getFullYear() === year && spending.date.getMonth() === month - 1,
      );
    },
  };

  return { repository, items, listCalls };
}

describe('runRecurringExpenseGeneration', () => {
  it('does nothing when there are no active recurring expenses', async () => {
    const recurringExpenseRepository = createFakeRecurringExpenseRepository([]);
    const { repository: spendingRepository, items } = createFakeSpendingRepository([]);

    await runRecurringExpenseGeneration(
      recurringExpenseRepository,
      spendingRepository,
      new Date(2026, 7, 15),
    );

    expect(items).toEqual([]);
  });

  it('persists the spends computed as due, using the repositories', async () => {
    const re: RecurringExpense = {
      id: 're-1',
      name: 'Rent',
      amount: 120000,
      categoryId: 'bills',
      dayOfMonth: 1,
      active: true,
    };
    const recurringExpenseRepository = createFakeRecurringExpenseRepository([re]);
    const { repository: spendingRepository, items } = createFakeSpendingRepository([]);

    await runRecurringExpenseGeneration(
      recurringExpenseRepository,
      spendingRepository,
      new Date(2026, 7, 15),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      amount: 120000,
      categoryId: 'bills',
      source: 'recurring',
      note: buildRecurringNoteMarker('re-1'),
    });
  });

  it('does not create a second spend on a repeat run within the same period', async () => {
    const re: RecurringExpense = {
      id: 're-1',
      name: 'Rent',
      amount: 120000,
      categoryId: 'bills',
      dayOfMonth: 1,
      active: true,
    };
    const recurringExpenseRepository = createFakeRecurringExpenseRepository([re]);
    const { repository: spendingRepository, items } = createFakeSpendingRepository([]);
    const now = new Date(2026, 7, 15);

    await runRecurringExpenseGeneration(recurringExpenseRepository, spendingRepository, now);
    await runRecurringExpenseGeneration(recurringExpenseRepository, spendingRepository, now);

    expect(items).toHaveLength(1);
  });

  it('only queries a bounded window of months, not unbounded history', async () => {
    const recurringExpenseRepository = createFakeRecurringExpenseRepository([
      { id: 're-1', name: 'Rent', amount: 100, categoryId: 'bills', dayOfMonth: 1, active: true },
    ]);
    const { repository: spendingRepository, listCalls } = createFakeSpendingRepository([]);

    await runRecurringExpenseGeneration(
      recurringExpenseRepository,
      spendingRepository,
      new Date(2026, 7, 15),
    );

    expect(listCalls).toHaveLength(24);
  });
});
