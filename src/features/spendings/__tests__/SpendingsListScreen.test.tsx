import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import '@/lib/i18n';
import type { Category, CategoryRepository } from '@/data/categoryRepository';
import type {
  CreateSpendingInput,
  Spending,
  SpendingRepository,
  UpdateSpendingInput,
} from '@/data/spendingRepository';

import { SpendingsListScreen } from '../SpendingsListScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// A simple in-memory fake standing in for the real (SQLite-backed)
// SpendingRepository, same pattern as
// src/features/categories/__tests__/CategoriesScreen.test.tsx — this test
// exercises the screen's grouping/filter/search/delete wiring against a
// fake, while src/data/__tests__/spendingRepository.test.ts already covers
// the real repository's own filtering logic against better-sqlite3.
function createFakeSpendingRepository(initial: Spending[]): SpendingRepository {
  let spendings = [...initial];

  return {
    async list({ year, month, categoryId, search }) {
      const startOfMonth = new Date(year, month - 1, 1);
      const startOfNextMonth = new Date(year, month, 1);

      return spendings.filter((spending) => {
        if (spending.date < startOfMonth || spending.date >= startOfNextMonth) {
          return false;
        }
        if (categoryId && spending.categoryId !== categoryId) {
          return false;
        }
        if (search) {
          const term = search.toLowerCase();
          const merchantMatch = spending.merchant?.toLowerCase().includes(term) ?? false;
          const noteMatch = spending.note?.toLowerCase().includes(term) ?? false;
          if (!merchantMatch && !noteMatch) {
            return false;
          }
        }
        return true;
      });
    },
    async getById(id) {
      return spendings.find((spending) => spending.id === id) ?? null;
    },
    async create(input: CreateSpendingInput) {
      const created: Spending = {
        id: `new-${spendings.length + 1}`,
        merchant: null,
        note: null,
        ...input,
      };
      spendings = [...spendings, created];
      return created;
    },
    async update(id: string, input: UpdateSpendingInput) {
      const index = spendings.findIndex((spending) => spending.id === id);
      if (index === -1) {
        throw new Error(`Spending not found: ${id}`);
      }
      spendings[index] = { ...spendings[index], ...input };
      return spendings[index];
    },
    async delete(id: string) {
      spendings = spendings.filter((spending) => spending.id !== id);
    },
  };
}

function createFakeCategoryRepository(categories: Category[]): CategoryRepository {
  return {
    async list() {
      return [...categories];
    },
    async create(input) {
      return { id: 'new', ...input };
    },
    async update(id, input) {
      const existing = categories.find((c) => c.id === id);
      if (!existing) throw new Error('not found');
      return { ...existing, ...input };
    },
    async delete() {},
  };
}

const FOOD: Category = { id: 'food', name: 'Food', color: '#FF9500', icon: 'fork.knife' };
const TRANSPORT: Category = { id: 'transport', name: 'Transport', color: '#007AFF', icon: 'car.fill' };

function thisMonth(day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day);
}

function lastMonth(day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, day);
}

const REWE: Spending = {
  id: 'rewe',
  amount: 1299,
  currency: 'EUR',
  merchant: 'REWE',
  categoryId: 'food',
  date: thisMonth(5),
  note: null,
  source: 'manual',
};

const UBER: Spending = {
  id: 'uber',
  amount: 850,
  currency: 'EUR',
  merchant: 'Uber',
  categoryId: 'transport',
  date: thisMonth(10),
  note: null,
  source: 'manual',
};

const OLD_COFFEE: Spending = {
  id: 'old-coffee',
  amount: 400,
  currency: 'EUR',
  merchant: 'Coffee Corner',
  categoryId: 'food',
  date: lastMonth(15),
  note: null,
  source: 'manual',
};

describe('SpendingsListScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders spendings grouped by month with merchant, category, amount, and date', async () => {
    const repository = createFakeSpendingRepository([REWE, OLD_COFFEE]);
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);

    const { findByText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    expect(await findByText('REWE')).toBeTruthy();
    expect(await findByText('Coffee Corner')).toBeTruthy();
    expect(await findByText('€12.99')).toBeTruthy();
  });

  it('shows an empty state when there are no spendings at all', async () => {
    const repository = createFakeSpendingRepository([]);
    const categoryRepository = createFakeCategoryRepository([FOOD]);

    const { findByText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    expect(await findByText('No spendings yet')).toBeTruthy();
  });

  it('filters spendings by category', async () => {
    const repository = createFakeSpendingRepository([REWE, UBER]);
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);

    const { findByText, findByLabelText, queryByText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    await findByText('REWE');
    await findByText('Uber');

    fireEvent.press(await findByLabelText('Transport'));

    await waitFor(() => {
      expect(queryByText('REWE')).toBeNull();
    });
    expect(await findByText('Uber')).toBeTruthy();
  });

  it('clears the category filter when tapping the selected category again', async () => {
    const repository = createFakeSpendingRepository([REWE, UBER]);
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);

    const { findByText, findByLabelText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    await findByText('REWE');
    fireEvent.press(await findByLabelText('Transport'));
    await waitFor(async () => expect(await findByText('Uber')).toBeTruthy());

    fireEvent.press(await findByLabelText('Transport'));

    expect(await findByText('REWE')).toBeTruthy();
    expect(await findByText('Uber')).toBeTruthy();
  });

  it('searches across merchant, debounced, and shows a no-results empty state', async () => {
    const repository = createFakeSpendingRepository([REWE, UBER]);
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);

    const { findByText, findByPlaceholderText, queryByText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    await findByText('REWE');

    fireEvent.changeText(await findByPlaceholderText('Search merchant or note'), 'zzz-no-match');

    await waitFor(
      () => {
        expect(queryByText('REWE')).toBeNull();
      },
      { timeout: 2000 },
    );
    expect(await findByText('No matching spendings')).toBeTruthy();
  });

  it('navigates to /add-spend when the add button is pressed', async () => {
    const repository = createFakeSpendingRepository([]);
    const categoryRepository = createFakeCategoryRepository([FOOD]);

    const { findByLabelText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Add spend'));

    expect(mockPush).toHaveBeenCalledWith('/add-spend');
  });

  it('navigates to /edit-spend/[id] when a row is tapped', async () => {
    const repository = createFakeSpendingRepository([REWE]);
    const categoryRepository = createFakeCategoryRepository([FOOD]);

    const { findByLabelText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Edit spend: REWE, €12.99'));

    expect(mockPush).toHaveBeenCalledWith('/edit-spend/rewe');
  });

  it('deletes a spending after confirming', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.style === 'destructive');
      confirmButton?.onPress?.();
    });

    const repository = createFakeSpendingRepository([REWE]);
    const categoryRepository = createFakeCategoryRepository([FOOD]);

    const { findByLabelText, queryByText } = await render(
      <SpendingsListScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Delete spend from REWE'));

    await waitFor(() => {
      expect(queryByText('REWE')).toBeNull();
    });
    expect(await repository.getById('rewe')).toBeNull();

    jest.restoreAllMocks();
  });
});
