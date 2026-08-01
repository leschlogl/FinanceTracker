import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createCategoryRepository, OTHER_CATEGORY_ID } from '../categoryRepository';
import * as schema from '../schema';

// expo-sqlite is a native binding and can't run under Jest/Node, so this test
// applies the real generated migration SQL to an in-memory better-sqlite3 db —
// same pattern as src/data/__tests__/schema.test.ts.
function createTestDb() {
  const sqlite = new Database(':memory:');
  const migrationSql = readFileSync(
    join(__dirname, '../migrations/0000_glossy_synch.sql'),
    'utf-8',
  );
  sqlite.exec(migrationSql.replace(/-->\s*statement-breakpoint/g, ''));
  return drizzle(sqlite, { schema });
}

describe('categoryRepository', () => {
  it('creates and lists categories', async () => {
    const db = createTestDb();
    const repository = createCategoryRepository(db);

    const created = await repository.create({ name: 'Food', color: '#FF0000', icon: 'fork.knife' });

    expect(created.name).toBe('Food');
    expect(created.id).toBeTruthy();

    const all = await repository.list();
    expect(all).toEqual([created]);
  });

  it('updates a category', async () => {
    const db = createTestDb();
    const repository = createCategoryRepository(db);

    const created = await repository.create({ name: 'Food', color: '#FF0000', icon: 'fork.knife' });
    const updated = await repository.update(created.id, { name: 'Groceries', color: '#00FF00' });

    expect(updated).toEqual({
      id: created.id,
      name: 'Groceries',
      color: '#00FF00',
      icon: 'fork.knife',
    });
  });

  it('rejects updating a category that does not exist', async () => {
    const db = createTestDb();
    const repository = createCategoryRepository(db);

    await expect(repository.update('missing', { name: 'x' })).rejects.toThrow('Category not found');
  });

  it('deletes a category and reassigns its spendings to Other', async () => {
    const db = createTestDb();
    const repository = createCategoryRepository(db);

    await db
      .insert(schema.categories)
      .values({ id: OTHER_CATEGORY_ID, name: 'Other', color: '#888', icon: 'ellipsis' })
      .run();
    const food = await repository.create({ name: 'Food', color: '#FF0000', icon: 'fork.knife' });

    db.insert(schema.spendings)
      .values({
        id: 'spend-1',
        amount: 500,
        currency: 'EUR',
        merchant: 'REWE',
        categoryId: food.id,
        date: new Date('2026-08-01'),
        note: null,
        source: 'manual',
      })
      .run();

    await repository.delete(food.id);

    const remainingCategories = await repository.list();
    expect(remainingCategories.map((c) => c.id)).toEqual([OTHER_CATEGORY_ID]);

    const [spending] = db.select().from(schema.spendings).all();
    expect(spending.categoryId).toBe(OTHER_CATEGORY_ID);
  });

  it('cannot delete the Other category', async () => {
    const db = createTestDb();
    const repository = createCategoryRepository(db);

    await db
      .insert(schema.categories)
      .values({ id: OTHER_CATEGORY_ID, name: 'Other', color: '#888', icon: 'ellipsis' })
      .run();

    await expect(repository.delete(OTHER_CATEGORY_ID)).rejects.toThrow('cannot be deleted');

    const all = await repository.list();
    expect(all).toHaveLength(1);
  });
});
