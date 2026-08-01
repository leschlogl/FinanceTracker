import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as schema from '../schema';

// expo-sqlite is a native binding and can't run under Jest/Node, so this test
// applies the real generated migration SQL to an in-memory better-sqlite3 db —
// proving the schema/queries are correct independently of the RN runtime.
function createTestDb() {
  const sqlite = new Database(':memory:');
  const migrationSql = readFileSync(
    join(__dirname, '../migrations/0000_glossy_synch.sql'),
    'utf-8',
  );
  sqlite.exec(migrationSql.replace(/-->\s*statement-breakpoint/g, ''));
  return drizzle(sqlite, { schema });
}

describe('data layer plumbing', () => {
  it('inserts and reads a category through drizzle', () => {
    const db = createTestDb();

    db.insert(schema.categories)
      .values({ id: 'food', name: 'Food', color: '#FF0000', icon: 'fork.knife' })
      .run();

    const rows = db.select().from(schema.categories).all();

    expect(rows).toEqual([{ id: 'food', name: 'Food', color: '#FF0000', icon: 'fork.knife' }]);
  });

  it('inserts a spending referencing a category and reads it back', () => {
    const db = createTestDb();

    db.insert(schema.categories)
      .values({ id: 'food', name: 'Food', color: '#FF0000', icon: 'fork.knife' })
      .run();

    const date = new Date('2026-08-01T12:00:00.000Z');
    db.insert(schema.spendings)
      .values({
        id: 'spend-1',
        amount: 1299,
        currency: 'EUR',
        merchant: 'REWE',
        categoryId: 'food',
        date,
        note: null,
        source: 'manual',
      })
      .run();

    const [row] = db.select().from(schema.spendings).all();

    expect(row.amount).toBe(1299);
    expect(row.currency).toBe('EUR');
    expect(row.source).toBe('manual');
    expect(row.date).toEqual(date);
  });
});
