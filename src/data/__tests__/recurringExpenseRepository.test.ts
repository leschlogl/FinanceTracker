import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createRecurringExpenseRepository } from '../recurringExpenseRepository';
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

function seedCategory(db: ReturnType<typeof createTestDb>, id = 'bills') {
  db.insert(schema.categories)
    .values({ id, name: 'Bills', color: '#F00', icon: 'doc.text.fill' })
    .run();
  return id;
}

describe('recurringExpenseRepository', () => {
  it('creates a recurring expense, defaulting to active', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createRecurringExpenseRepository(db);

    const created = await repository.create({
      name: 'Rent',
      amount: 120000,
      categoryId,
      dayOfMonth: 1,
    });

    expect(created.active).toBe(true);
    expect(created.id).toBeTruthy();
  });

  it('updates a recurring expense', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createRecurringExpenseRepository(db);

    const created = await repository.create({
      name: 'Rent',
      amount: 120000,
      categoryId,
      dayOfMonth: 1,
    });
    const updated = await repository.update(created.id, { amount: 125000 });

    expect(updated.amount).toBe(125000);
    expect(updated.name).toBe('Rent');
  });

  it('rejects updating a recurring expense that does not exist', async () => {
    const db = createTestDb();
    const repository = createRecurringExpenseRepository(db);

    await expect(repository.update('missing', { amount: 100 })).rejects.toThrow(
      'Recurring expense not found',
    );
  });

  it('deletes a recurring expense', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createRecurringExpenseRepository(db);

    const created = await repository.create({
      name: 'Rent',
      amount: 120000,
      categoryId,
      dayOfMonth: 1,
    });
    await repository.delete(created.id);

    expect(await repository.listActive()).toEqual([]);
  });

  it('listActive only returns active recurring expenses', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createRecurringExpenseRepository(db);

    const rent = await repository.create({
      name: 'Rent',
      amount: 120000,
      categoryId,
      dayOfMonth: 1,
    });
    await repository.create({
      name: 'Old subscription',
      amount: 999,
      categoryId,
      dayOfMonth: 15,
      active: false,
    });

    const active = await repository.listActive();

    expect(active.map((r) => r.id)).toEqual([rent.id]);
  });
});
