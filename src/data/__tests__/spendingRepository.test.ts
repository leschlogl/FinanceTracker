import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSpendingRepository } from '../spendingRepository';
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

function seedCategory(db: ReturnType<typeof createTestDb>, id = 'food') {
  db.insert(schema.categories)
    .values({ id, name: 'Food', color: '#FF0000', icon: 'fork.knife' })
    .run();
  return id;
}

describe('spendingRepository', () => {
  it('creates a spending and reads it back by id', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createSpendingRepository(db);

    const created = await repository.create({
      amount: 1299,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId,
      date: new Date('2026-08-01T12:00:00.000Z'),
      note: null,
      source: 'manual',
    });

    expect(created.id).toBeTruthy();
    expect(created.amount).toBe(1299);

    const fetched = await repository.getById(created.id);
    expect(fetched).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    const db = createTestDb();
    const repository = createSpendingRepository(db);

    expect(await repository.getById('missing')).toBeNull();
  });

  it('updates a spending', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createSpendingRepository(db);

    const created = await repository.create({
      amount: 1000,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId,
      date: new Date('2026-08-01'),
      source: 'manual',
    });

    const updated = await repository.update(created.id, { amount: 2000, note: 'weekly shop' });

    expect(updated.amount).toBe(2000);
    expect(updated.note).toBe('weekly shop');
  });

  it('rejects updating a spending that does not exist', async () => {
    const db = createTestDb();
    const repository = createSpendingRepository(db);

    await expect(repository.update('missing', { amount: 100 })).rejects.toThrow(
      'Spending not found',
    );
  });

  it('deletes a spending', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createSpendingRepository(db);

    const created = await repository.create({
      amount: 1000,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId,
      date: new Date('2026-08-01'),
      source: 'manual',
    });

    await repository.delete(created.id);

    expect(await repository.getById(created.id)).toBeNull();
  });

  it('lists spendings for a given month, excluding other months', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createSpendingRepository(db);

    await repository.create({
      amount: 100,
      currency: 'EUR',
      merchant: 'In August',
      categoryId,
      date: new Date(2026, 7, 15),
      source: 'manual',
    });
    await repository.create({
      amount: 200,
      currency: 'EUR',
      merchant: 'In July',
      categoryId,
      date: new Date(2026, 6, 15),
      source: 'manual',
    });
    await repository.create({
      amount: 300,
      currency: 'EUR',
      merchant: 'In September',
      categoryId,
      date: new Date(2026, 8, 15),
      source: 'manual',
    });

    const results = await repository.list({ year: 2026, month: 8 });

    expect(results.map((s) => s.merchant)).toEqual(['In August']);
  });

  it('filters by category within the month', async () => {
    const db = createTestDb();
    const foodId = seedCategory(db, 'food');
    db.insert(schema.categories)
      .values({ id: 'transport', name: 'Transport', color: '#00F', icon: 'car' })
      .run();
    const repository = createSpendingRepository(db);

    await repository.create({
      amount: 100,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId: foodId,
      date: new Date(2026, 7, 5),
      source: 'manual',
    });
    await repository.create({
      amount: 200,
      currency: 'EUR',
      merchant: 'Uber',
      categoryId: 'transport',
      date: new Date(2026, 7, 6),
      source: 'manual',
    });

    const results = await repository.list({ year: 2026, month: 8, categoryId: 'transport' });

    expect(results.map((s) => s.merchant)).toEqual(['Uber']);
  });

  it('searches case-insensitively across merchant and note within the month', async () => {
    const db = createTestDb();
    const categoryId = seedCategory(db);
    const repository = createSpendingRepository(db);

    await repository.create({
      amount: 100,
      currency: 'EUR',
      merchant: 'COFFEE Corner',
      categoryId,
      date: new Date(2026, 7, 5),
      source: 'manual',
    });
    await repository.create({
      amount: 200,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId,
      note: 'coffee beans for the office',
      date: new Date(2026, 7, 6),
      source: 'manual',
    });
    await repository.create({
      amount: 300,
      currency: 'EUR',
      merchant: 'Cinema',
      categoryId,
      date: new Date(2026, 7, 7),
      source: 'manual',
    });

    const results = await repository.list({ year: 2026, month: 8, search: 'coffee' });

    expect(results.map((s) => s.merchant).sort()).toEqual(['COFFEE Corner', 'REWE']);
  });
});
