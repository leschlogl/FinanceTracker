import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { OTHER_CATEGORY_ID } from './categoryRepository';
import * as schema from './schema';
import { categories } from './schema';

// PRODUCT_SPEC.md → Categories: predefined defaults.
const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', color: '#FF9500', icon: 'fork.knife' },
  { id: 'transport', name: 'Transport', color: '#007AFF', icon: 'car.fill' },
  { id: 'shopping', name: 'Shopping', color: '#AF52DE', icon: 'bag.fill' },
  { id: 'bills', name: 'Bills', color: '#FF3B30', icon: 'doc.text.fill' },
  { id: 'entertainment', name: 'Entertainment', color: '#5856D6', icon: 'film.fill' },
  { id: 'health', name: 'Health', color: '#34C759', icon: 'heart.fill' },
  { id: OTHER_CATEGORY_ID, name: 'Other', color: '#8E8E93', icon: 'ellipsis.circle.fill' },
];

type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>;

/**
 * Seeds the predefined categories on first launch. Idempotent: if any category
 * already exists (including a user having edited/deleted the seeded ones,
 * `Other` excepted — see categoryRepository), this is a no-op.
 *
 * `database` defaults to the real on-device database, loaded lazily on first
 * use so importing this module in a test that passes its own test database
 * never opens the native expo-sqlite connection.
 */
export async function seedDefaultCategories(database?: AppDatabase): Promise<void> {
  const resolvedDb =
    database ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, see above
    (require('./db') as typeof import('./db')).db;

  const existing = await resolvedDb.select().from(categories).limit(1).all();

  if (existing.length > 0) {
    return;
  }

  await resolvedDb.insert(categories).values(DEFAULT_CATEGORIES).run();
}
