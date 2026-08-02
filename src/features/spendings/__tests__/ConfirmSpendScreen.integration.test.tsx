import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import '@/lib/i18n';
import { createCategoryRepository } from '@/data/categoryRepository';
import * as schema from '@/data/schema';
import { createSpendingRepository } from '@/data/spendingRepository';

import { ConfirmSpendScreen } from '../ConfirmSpendScreen';

// expo-sqlite is a native binding and can't run under Jest/Node, so this test
// applies the real generated migration SQL to an in-memory better-sqlite3 db —
// same pattern as src/features/categories/__tests__/CategoriesScreen.integration.test.tsx.
// This is the acceptance criteria's "spend created here is verifiable
// end-to-end against the real repository" check, going through the screen's
// actual save handler rather than calling the repository directly.
function createTestDb() {
  const sqlite = new Database(':memory:');
  const migrationSql = readFileSync(
    join(__dirname, '../../../data/migrations/0000_glossy_synch.sql'),
    'utf-8',
  );
  sqlite.exec(migrationSql.replace(/-->\s*statement-breakpoint/g, ''));
  return drizzle(sqlite, { schema });
}

describe('ConfirmSpendScreen (integration)', () => {
  it('creates a spending via the real repository with source "manual" and correct amount conversion', async () => {
    const db = createTestDb();
    const categoryRepository = createCategoryRepository(db);
    const spendingRepository = createSpendingRepository(db);
    const food = await categoryRepository.create({
      name: 'Food',
      color: '#FF9500',
      icon: 'fork.knife',
    });
    const onDone = jest.fn();

    const { findByLabelText, findByPlaceholderText, findByText } = await render(
      <ConfirmSpendScreen
        repository={spendingRepository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.changeText(await findByPlaceholderText('0.00'), '19.99');
    fireEvent.changeText(await findByPlaceholderText('e.g. REWE'), 'REWE');
    fireEvent.press(await findByLabelText('Food'));
    fireEvent.press(await findByText('Save'));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    const [row] = await spendingRepository.list({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    });

    expect(row).toMatchObject({
      amount: 1999,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId: food.id,
      source: 'manual',
    });

    const fetched = await spendingRepository.getById(row.id);
    expect(fetched).toEqual(row);
  }, 15000);

  it('edits an existing spending via the real repository', async () => {
    const db = createTestDb();
    const categoryRepository = createCategoryRepository(db);
    const spendingRepository = createSpendingRepository(db);
    const food = await categoryRepository.create({
      name: 'Food',
      color: '#FF9500',
      icon: 'fork.knife',
    });
    const created = await spendingRepository.create({
      amount: 1000,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId: food.id,
      date: new Date(2026, 6, 15),
      source: 'manual',
    });
    const onDone = jest.fn();

    const { findByDisplayValue, findByText } = await render(
      <ConfirmSpendScreen
        spendingId={created.id}
        repository={spendingRepository}
        categoryRepository={categoryRepository}
        onDone={onDone}
      />,
    );

    fireEvent.changeText(await findByDisplayValue('10.00'), '25.50');
    fireEvent.press(await findByText('Save'));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    const updated = await spendingRepository.getById(created.id);
    expect(updated).toMatchObject({ amount: 2550, source: 'manual' });
  }, 15000);
});
