import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';
import { categories, spendings } from './schema';

// The seeded "Other" category is the reassignment target when another category is
// deleted (see PRODUCT_SPEC.md → Categories) and must always exist, so it's seeded
// with this stable id rather than matched on name (names/renames shouldn't matter).
export const OTHER_CATEGORY_ID = 'other';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface CreateCategoryInput {
  name: string;
  color: string;
  icon: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string;
}

export interface CategoryRepository {
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: UpdateCategoryInput): Promise<Category>;
  /** Reassigns the category's existing spendings to Other, then removes it. No-ops on the Other category itself. */
  delete(id: string): Promise<void>;
  list(): Promise<Category[]>;
}

type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>;

export function createCategoryRepository(database: AppDatabase): CategoryRepository {
  return {
    async create(input) {
      const [row] = await database
        .insert(categories)
        .values({ id: crypto.randomUUID(), ...input })
        .returning();

      return row;
    },

    async update(id, input) {
      const [row] = await database
        .update(categories)
        .set(input)
        .where(eq(categories.id, id))
        .returning();

      if (!row) {
        throw new Error(`Category not found: ${id}`);
      }

      return row;
    },

    async delete(id) {
      if (id === OTHER_CATEGORY_ID) {
        // Other is the reassignment target for every other deletion, so it can't be
        // removed itself. This is a normal, catchable rejection, not a crash.
        throw new Error('The Other category cannot be deleted.');
      }

      await database
        .update(spendings)
        .set({ categoryId: OTHER_CATEGORY_ID })
        .where(eq(spendings.categoryId, id))
        .run();

      await database.delete(categories).where(eq(categories.id, id)).run();
    },

    async list() {
      return database.select().from(categories).all();
    },
  };
}

let defaultInstance: CategoryRepository | undefined;

/**
 * Lazily-constructed singleton bound to the real on-device database. Lazy so
 * importing this module (e.g. for its types/factory in tests that inject their
 * own test database) never opens the native expo-sqlite connection — only
 * calling this function does.
 */
export function getCategoryRepository(): CategoryRepository {
  if (!defaultInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, see above
    const { db } = require('./db') as typeof import('./db');
    defaultInstance = createCategoryRepository(db);
  }

  return defaultInstance;
}
