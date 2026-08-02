import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Alert } from 'react-native';

import '@/lib/i18n';
import { createCategoryRepository, OTHER_CATEGORY_ID } from '@/data/categoryRepository';
import * as schema from '@/data/schema';

import { CategoriesScreen } from '../CategoriesScreen';

// expo-sqlite is a native binding and can't run under Jest/Node, so this test
// applies the real generated migration SQL to an in-memory better-sqlite3 db,
// same pattern as src/data/__tests__/categoryRepository.test.ts — this is the
// "integration-style test using the real repository + better-sqlite3" the
// acceptance criteria in docs/features/02-categories-management.md asks for,
// verifying delete-reassigns-to-Other end-to-end through the screen's UI.
function createTestDb() {
  const sqlite = new Database(':memory:');
  const migrationSql = readFileSync(
    join(__dirname, '../../../data/migrations/0000_glossy_synch.sql'),
    'utf-8',
  );
  sqlite.exec(migrationSql.replace(/-->\s*statement-breakpoint/g, ''));
  return drizzle(sqlite, { schema });
}

describe('CategoriesScreen (integration)', () => {
  // Real SQLite (better-sqlite3) + a full render/delete/refetch cycle through the
  // screen's UI is inherently heavier than the mocked-repository unit tests in
  // CategoriesScreen.test.tsx — Jest's 5000ms default was tight enough to flake
  // on slower CI hardware even though it passed comfortably locally.
  it(
    'reassigns existing spendings to Other when their category is deleted',
    async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
        const confirmButton = buttons?.find((button) => button.style === 'destructive');
        confirmButton?.onPress?.();
      });

      const db = createTestDb();
      const repository = createCategoryRepository(db);

      await db
        .insert(schema.categories)
        .values({
          id: OTHER_CATEGORY_ID,
          name: 'Other',
          color: '#8E8E93',
          icon: 'ellipsis.circle.fill',
        })
        .run();
      const food = await repository.create({ name: 'Food', color: '#FF9500', icon: 'fork.knife' });
      db.insert(schema.spendings)
        .values({
          id: 'spend-1',
          amount: 1200,
          currency: 'EUR',
          merchant: 'REWE',
          categoryId: food.id,
          date: new Date('2026-08-01'),
          note: null,
          source: 'manual',
        })
        .run();

      const { findByLabelText, findByText, queryByText } = await render(
        <CategoriesScreen repository={repository} />,
      );

      await findByText('Food');
      fireEvent.press(await findByLabelText('Delete Food'));

      await waitFor(() => {
        expect(queryByText('Food')).toBeNull();
      });

      const [spending] = db.select().from(schema.spendings).all();
      expect(spending.categoryId).toBe(OTHER_CATEGORY_ID);

      const remainingCategories = await repository.list();
      expect(remainingCategories.map((category) => category.id)).toEqual([OTHER_CATEGORY_ID]);

      jest.restoreAllMocks();
    },
    15000,
  );
});
