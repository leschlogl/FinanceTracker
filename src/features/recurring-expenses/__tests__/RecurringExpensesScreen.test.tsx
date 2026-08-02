import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import '@/lib/i18n';
import type { Category, CategoryRepository } from '@/data/categoryRepository';
import type {
  RecurringExpense,
  RecurringExpenseRepository,
} from '@/data/recurringExpenseRepository';

import { RecurringExpensesScreen } from '../RecurringExpensesScreen';

// In-memory fakes standing in for the real (SQLite-backed) repositories, per
// docs/features/06-recurring-expenses.md's acceptance criteria: the CRUD
// screen is tested via RNTL against a test repository here — same approach
// as src/features/categories/__tests__/CategoriesScreen.test.tsx.
function createFakeRecurringExpenseRepository(
  initial: RecurringExpense[],
): RecurringExpenseRepository {
  let items = [...initial];
  let nextId = 1;

  return {
    async create(input) {
      const created: RecurringExpense = {
        id: `new-${nextId++}`,
        active: input.active ?? true,
        ...input,
      };
      items = [...items, created];
      return created;
    },
    async update(id, input) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`Recurring expense not found: ${id}`);
      }
      items[index] = { ...items[index], ...input };
      return items[index];
    },
    async delete(id) {
      items = items.filter((item) => item.id !== id);
    },
    async listActive() {
      return items.filter((item) => item.active);
    },
  };
}

function createFakeCategoryRepository(categories: Category[]): CategoryRepository {
  return {
    async list() {
      return categories;
    },
    async create() {
      throw new Error('not needed for this test');
    },
    async update() {
      throw new Error('not needed for this test');
    },
    async delete() {
      throw new Error('not needed for this test');
    },
  };
}

const BILLS: Category = { id: 'bills', name: 'Bills', color: '#FF3B30', icon: 'doc.text.fill' };
const RENT: RecurringExpense = {
  id: 'rent',
  name: 'Rent',
  amount: 120000,
  categoryId: 'bills',
  dayOfMonth: 1,
  active: true,
};

describe('RecurringExpensesScreen', () => {
  it('renders the recurring expenses from the repository', async () => {
    const repository = createFakeRecurringExpenseRepository([RENT]);
    const categoryRepository = createFakeCategoryRepository([BILLS]);
    const { findByText } = await render(
      <RecurringExpensesScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    expect(await findByText('Rent')).toBeTruthy();
  });

  it('shows an empty state when there are no recurring expenses', async () => {
    const repository = createFakeRecurringExpenseRepository([]);
    const categoryRepository = createFakeCategoryRepository([BILLS]);
    const { findByText } = await render(
      <RecurringExpensesScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    expect(await findByText('No recurring expenses yet')).toBeTruthy();
  });

  it('adds a new recurring expense through the form', async () => {
    const repository = createFakeRecurringExpenseRepository([]);
    const categoryRepository = createFakeCategoryRepository([BILLS]);
    const { findByLabelText, findByPlaceholderText, findByText } = await render(
      <RecurringExpensesScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Add recurring expense'));
    fireEvent.changeText(await findByPlaceholderText('e.g. Rent'), 'Netflix');
    fireEvent.changeText(await findByPlaceholderText('0.00'), '15.99');
    fireEvent.press(await findByLabelText('Bills'));
    fireEvent.changeText(await findByPlaceholderText('e.g. 1'), '5');
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Netflix')).toBeTruthy();
    const created = await repository.listActive();
    expect(created).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Netflix',
          amount: 1599,
          categoryId: 'bills',
          dayOfMonth: 5,
        }),
      ]),
    );
  });

  it('does not submit the add form when required fields are missing', async () => {
    const repository = createFakeRecurringExpenseRepository([]);
    const categoryRepository = createFakeCategoryRepository([BILLS]);
    const { findByLabelText, findByText } = await render(
      <RecurringExpensesScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Add recurring expense'));
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Name is required')).toBeTruthy();
    expect(await repository.listActive()).toEqual([]);
  });

  it('edits an existing recurring expense', async () => {
    const repository = createFakeRecurringExpenseRepository([RENT]);
    const categoryRepository = createFakeCategoryRepository([BILLS]);
    const { findByLabelText, findByPlaceholderText, findByText } = await render(
      <RecurringExpensesScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Edit Rent'));
    fireEvent.changeText(await findByPlaceholderText('0.00'), '1300.00');
    fireEvent.press(await findByText('Save'));

    await waitFor(async () => {
      const [updated] = await repository.listActive();
      expect(updated.amount).toBe(130000);
    });
  });

  it('deletes a recurring expense after confirming', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.style === 'destructive');
      confirmButton?.onPress?.();
    });

    const repository = createFakeRecurringExpenseRepository([RENT]);
    const categoryRepository = createFakeCategoryRepository([BILLS]);
    const { findByLabelText, queryByText } = await render(
      <RecurringExpensesScreen repository={repository} categoryRepository={categoryRepository} />,
    );

    fireEvent.press(await findByLabelText('Delete Rent'));

    await waitFor(() => {
      expect(queryByText('Rent')).toBeNull();
    });
    expect(await repository.listActive()).toEqual([]);

    jest.restoreAllMocks();
  });
});
