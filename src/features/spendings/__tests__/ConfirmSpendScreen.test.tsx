import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import '@/lib/i18n';
import type { Category, CategoryRepository } from '@/data/categoryRepository';
import type { Spending, SpendingRepository } from '@/data/spendingRepository';

import { ConfirmSpendScreen } from '../ConfirmSpendScreen';

// Fakes standing in for the real SQLite-backed repositories, same approach as
// src/features/categories/__tests__/CategoriesScreen.test.tsx — create/edit
// are unit-tested here against mocked repositories; end-to-end correctness
// against the real repository is covered separately in
// ConfirmSpendScreen.integration.test.tsx.
function createFakeCategoryRepository(categories: Category[]): CategoryRepository {
  return {
    async list() {
      return categories;
    },
    async create(input) {
      return { id: 'new-category', ...input };
    },
    async update(id, input) {
      const existing = categories.find((category) => category.id === id);
      if (!existing) throw new Error('not found');
      return { ...existing, ...input };
    },
    async delete() {},
  };
}

function createFakeSpendingRepository(initial: Spending[] = []): SpendingRepository {
  let spendings = [...initial];
  let nextId = 1;

  return {
    async list() {
      return [...spendings];
    },
    async getById(id) {
      return spendings.find((spending) => spending.id === id) ?? null;
    },
    async create(input) {
      const created: Spending = {
        id: `new-${nextId++}`,
        ...input,
        merchant: input.merchant ?? null,
        note: input.note ?? null,
      };
      spendings = [...spendings, created];
      return created;
    },
    async update(id, input) {
      const index = spendings.findIndex((spending) => spending.id === id);
      if (index === -1) throw new Error(`Spending not found: ${id}`);
      spendings[index] = { ...spendings[index], ...input };
      return spendings[index];
    },
    async delete(id) {
      spendings = spendings.filter((spending) => spending.id !== id);
    },
  };
}

const FOOD: Category = { id: 'food', name: 'Food', color: '#FF9500', icon: 'fork.knife' };
const TRANSPORT: Category = {
  id: 'transport',
  name: 'Transport',
  color: '#007AFF',
  icon: 'car.fill',
};

describe('ConfirmSpendScreen (create)', () => {
  it('saves a new spending with source "manual" once amount and category are filled in', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);
    const repository = createFakeSpendingRepository();
    const onDone = jest.fn();

    const { findByLabelText, findByPlaceholderText, findByText } = await render(
      <ConfirmSpendScreen
        repository={repository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.changeText(await findByPlaceholderText('0.00'), '12.99');
    fireEvent.press(await findByLabelText('Food'));
    fireEvent.press(await findByText('Save'));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    const [saved] = await repository.list({ year: 2026, month: 8 });
    expect(saved).toMatchObject({
      amount: 1299,
      categoryId: 'food',
      source: 'manual',
      currency: 'EUR',
    });
  });

  it('does not save when the amount is missing', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD]);
    const repository = createFakeSpendingRepository();
    const onDone = jest.fn();

    const { findByLabelText, findByText } = await render(
      <ConfirmSpendScreen
        repository={repository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.press(await findByLabelText('Food'));
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Enter an amount greater than 0')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(await repository.list({ year: 2026, month: 8 })).toEqual([]);
  });

  it('does not save when no category is selected', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD]);
    const repository = createFakeSpendingRepository();
    const onDone = jest.fn();

    const { findByPlaceholderText, findByText } = await render(
      <ConfirmSpendScreen
        repository={repository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.changeText(await findByPlaceholderText('0.00'), '12.99');
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Select a category')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(await repository.list({ year: 2026, month: 8 })).toEqual([]);
  });

  it('pre-fills the form from initialValues (e.g. deep-link hints)', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD]);
    const repository = createFakeSpendingRepository();

    const { findByDisplayValue } = await render(
      <ConfirmSpendScreen
        repository={repository}
        categoryRepository={categoryRepository}
        initialValues={{ amount: '9.50', merchant: 'Coffee Corner', currency: 'USD' }}
      />,
    );

    expect(await findByDisplayValue('9.50')).toBeTruthy();
    expect(await findByDisplayValue('Coffee Corner')).toBeTruthy();
  });

  it('does not render a delete button when creating', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD]);
    const repository = createFakeSpendingRepository();

    const { queryByText } = await render(
      <ConfirmSpendScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    expect(queryByText('Delete spend')).toBeNull();
  });
});

describe('ConfirmSpendScreen (edit)', () => {
  const existing: Spending = {
    id: 'spend-1',
    amount: 1500,
    currency: 'EUR',
    merchant: 'REWE',
    categoryId: 'food',
    date: new Date(2026, 6, 15),
    note: 'weekly shop',
    source: 'manual',
  };

  it('pre-fills the form from the existing spending', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);
    const repository = createFakeSpendingRepository([existing]);

    const { findByDisplayValue } = await render(
      <ConfirmSpendScreen
        spendingId="spend-1"
        repository={repository}
        categoryRepository={categoryRepository}
      />,
    );

    expect(await findByDisplayValue('15.00')).toBeTruthy();
    expect(await findByDisplayValue('REWE')).toBeTruthy();
    expect(await findByDisplayValue('weekly shop')).toBeTruthy();
    expect(await findByDisplayValue('2026-07-15')).toBeTruthy();
  });

  it('saves changes via update, keeping the source unchanged', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD, TRANSPORT]);
    const repository = createFakeSpendingRepository([existing]);
    const onDone = jest.fn();

    const { findByLabelText, findByDisplayValue, findByText } = await render(
      <ConfirmSpendScreen
        spendingId="spend-1"
        repository={repository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.changeText(await findByDisplayValue('15.00'), '20.00');
    fireEvent.press(await findByLabelText('Transport'));
    fireEvent.press(await findByText('Save'));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    const updated = await repository.getById('spend-1');
    expect(updated).toMatchObject({ amount: 2000, categoryId: 'transport', source: 'manual' });
  });

  it('deletes the spending after confirming', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.style === 'destructive');
      confirmButton?.onPress?.();
    });

    const categoryRepository = createFakeCategoryRepository([FOOD]);
    const repository = createFakeSpendingRepository([existing]);
    const onDone = jest.fn();

    const { findByText } = await render(
      <ConfirmSpendScreen
        spendingId="spend-1"
        repository={repository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.press(await findByText('Delete spend'));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(await repository.getById('spend-1')).toBeNull();

    jest.restoreAllMocks();
  });

  it('shows a not-found message for an unknown spending id', async () => {
    const categoryRepository = createFakeCategoryRepository([FOOD]);
    const repository = createFakeSpendingRepository([]);

    const { findByText } = await render(
      <ConfirmSpendScreen
        spendingId="missing"
        repository={repository}
        categoryRepository={categoryRepository}
      />,
    );

    expect(await findByText("This spend couldn't be found.")).toBeTruthy();
  });
});
