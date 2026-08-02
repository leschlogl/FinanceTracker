import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import '@/lib/i18n';
import { OTHER_CATEGORY_ID, type Category, type CategoryRepository } from '@/data/categoryRepository';

import { CategoriesScreen } from '../CategoriesScreen';

// A simple in-memory fake standing in for the real (SQLite-backed)
// CategoryRepository, per docs/features/02-categories-management.md's
// acceptance criteria: add/rename/recolor/delete are unit-tested against a
// mocked/test repository here, not the real SQLite path. The delete →
// reassign-to-Other behavior itself is covered separately in
// CategoriesScreen.integration.test.tsx against the real repository.
function createFakeRepository(initial: Category[]): CategoryRepository {
  let categories = [...initial];
  let nextId = 1;

  return {
    async list() {
      return [...categories];
    },
    async create(input) {
      const created: Category = { id: `new-${nextId++}`, ...input };
      categories = [...categories, created];
      return created;
    },
    async update(id, input) {
      const index = categories.findIndex((category) => category.id === id);
      if (index === -1) {
        throw new Error(`Category not found: ${id}`);
      }
      categories[index] = { ...categories[index], ...input };
      return categories[index];
    },
    async delete(id) {
      if (id === OTHER_CATEGORY_ID) {
        throw new Error('The Other category cannot be deleted.');
      }
      categories = categories.filter((category) => category.id !== id);
    },
  };
}

const FOOD: Category = { id: 'food', name: 'Food', color: '#FF9500', icon: 'fork.knife' };
const OTHER: Category = { id: OTHER_CATEGORY_ID, name: 'Other', color: '#8E8E93', icon: 'ellipsis.circle.fill' };

describe('CategoriesScreen', () => {
  it('renders the categories from the repository', async () => {
    const repository = createFakeRepository([FOOD, OTHER]);
    const { findByText } = await render(<CategoriesScreen repository={repository} />);

    expect(await findByText('Food')).toBeTruthy();
    expect(await findByText('Other')).toBeTruthy();
  });

  it('shows an empty state when there are no categories', async () => {
    const repository = createFakeRepository([]);
    const { findByText } = await render(<CategoriesScreen repository={repository} />);

    expect(await findByText('No categories yet')).toBeTruthy();
  });

  it('does not render a delete action for the Other category', async () => {
    const repository = createFakeRepository([OTHER]);
    const { findByText, queryByLabelText } = await render(
      <CategoriesScreen repository={repository} />,
    );

    await findByText('Other');

    expect(queryByLabelText('Delete Other')).toBeNull();
  });

  it('adds a new category through the form', async () => {
    const repository = createFakeRepository([OTHER]);
    const { findByLabelText, findByPlaceholderText, findByText } = await render(
      <CategoriesScreen repository={repository} />,
    );

    fireEvent.press(await findByLabelText('Add category'));
    fireEvent.changeText(await findByPlaceholderText('e.g. Groceries'), 'Groceries');
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Groceries')).toBeTruthy();
    expect(await repository.list()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Groceries' })]),
    );
  });

  it('does not submit the add form when the name is empty', async () => {
    const repository = createFakeRepository([OTHER]);
    const { findByLabelText, findByText } = await render(
      <CategoriesScreen repository={repository} />,
    );

    fireEvent.press(await findByLabelText('Add category'));
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Name is required')).toBeTruthy();
    expect(await repository.list()).toEqual([OTHER]);
  });

  it('renames a category', async () => {
    const repository = createFakeRepository([FOOD, OTHER]);
    const { findByLabelText, findByPlaceholderText, findByText } = await render(
      <CategoriesScreen repository={repository} />,
    );

    fireEvent.press(await findByLabelText('Edit Food'));
    fireEvent.changeText(await findByPlaceholderText('e.g. Groceries'), 'Groceries');
    fireEvent.press(await findByText('Save'));

    expect(await findByText('Groceries')).toBeTruthy();
    const [updated] = await repository.list();
    expect(updated).toMatchObject({ id: 'food', name: 'Groceries' });
  });

  it('recolors a category', async () => {
    const repository = createFakeRepository([FOOD, OTHER]);
    const { findByLabelText, findByText } = await render(
      <CategoriesScreen repository={repository} />,
    );

    fireEvent.press(await findByLabelText('Edit Food'));
    fireEvent.press(await findByLabelText('Color #007AFF'));
    fireEvent.press(await findByText('Save'));

    await waitFor(async () => {
      const [updated] = await repository.list();
      expect(updated.color).toBe('#007AFF');
    });
  });

  it('deletes a category after confirming', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.style === 'destructive');
      confirmButton?.onPress?.();
    });

    const repository = createFakeRepository([FOOD, OTHER]);
    const { findByLabelText, queryByText } = await render(
      <CategoriesScreen repository={repository} />,
    );

    fireEvent.press(await findByLabelText('Delete Food'));

    await waitFor(() => {
      expect(queryByText('Food')).toBeNull();
    });
    expect(await repository.list()).toEqual([OTHER]);

    jest.restoreAllMocks();
  });
});
