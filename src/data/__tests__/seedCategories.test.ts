import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OTHER_CATEGORY_ID } from '../categoryRepository';
import * as schema from '../schema';
import { seedDefaultCategories } from '../seedCategories';

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

describe('seedDefaultCategories', () => {
  it('seeds the predefined categories from PRODUCT_SPEC.md, including a stable Other id', async () => {
    const db = createTestDb();

    await seedDefaultCategories(db);

    const rows = db.select().from(schema.categories).all();
    expect(rows).toHaveLength(7);
    expect(rows.map((c) => c.name).sort()).toEqual([
      'Bills',
      'Entertainment',
      'Food',
      'Health',
      'Other',
      'Shopping',
      'Transport',
    ]);
    expect(rows.find((c) => c.name === 'Other')?.id).toBe(OTHER_CATEGORY_ID);
  });

  it('is idempotent — calling it again does not duplicate categories', async () => {
    const db = createTestDb();

    await seedDefaultCategories(db);
    await seedDefaultCategories(db);

    const rows = db.select().from(schema.categories).all();
    expect(rows).toHaveLength(7);
  });

  it('does not reseed if categories already exist, even a custom one', async () => {
    const db = createTestDb();

    db.insert(schema.categories)
      .values({ id: 'custom', name: 'Custom', color: '#000', icon: 'star' })
      .run();

    await seedDefaultCategories(db);

    const rows = db.select().from(schema.categories).all();
    expect(rows).toHaveLength(1);
  });
});
