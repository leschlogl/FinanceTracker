import { and, eq, gte, like, lt, or } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';
import { spendings } from './schema';

export type SpendingSource = 'shortcut' | 'manual' | 'recurring';

export interface Spending {
  id: string;
  // Minor currency units (e.g. cents) — see comment on schema.spendings.amount.
  amount: number;
  currency: string;
  merchant: string | null;
  categoryId: string;
  date: Date;
  note: string | null;
  source: SpendingSource;
}

export interface CreateSpendingInput {
  amount: number;
  currency: string;
  merchant?: string | null;
  categoryId: string;
  date: Date;
  note?: string | null;
  source: SpendingSource;
}

export interface UpdateSpendingInput {
  amount?: number;
  currency?: string;
  merchant?: string | null;
  categoryId?: string;
  date?: Date;
  note?: string | null;
}

export interface ListSpendingsParams {
  year: number;
  /** 1-12 */
  month: number;
  categoryId?: string;
  /** Case-insensitive substring match across merchant and note. */
  search?: string;
}

export interface SpendingRepository {
  create(input: CreateSpendingInput): Promise<Spending>;
  update(id: string, input: UpdateSpendingInput): Promise<Spending>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Spending | null>;
  list(params: ListSpendingsParams): Promise<Spending[]>;
}

type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>;

export function createSpendingRepository(database: AppDatabase): SpendingRepository {
  return {
    async create(input) {
      const [row] = await database
        .insert(spendings)
        .values({
          id: crypto.randomUUID(),
          amount: input.amount,
          currency: input.currency,
          merchant: input.merchant ?? null,
          categoryId: input.categoryId,
          date: input.date,
          note: input.note ?? null,
          source: input.source,
        })
        .returning();

      return row;
    },

    async update(id, input) {
      const [row] = await database
        .update(spendings)
        .set(input)
        .where(eq(spendings.id, id))
        .returning();

      if (!row) {
        throw new Error(`Spending not found: ${id}`);
      }

      return row;
    },

    async delete(id) {
      await database.delete(spendings).where(eq(spendings.id, id)).run();
    },

    async getById(id) {
      const row = await database.select().from(spendings).where(eq(spendings.id, id)).get();

      return row ?? null;
    },

    async list({ year, month, categoryId, search }) {
      // Spending.date is a real JS Date (mode: 'timestamp'), so filter with Date
      // range boundaries rather than string comparison.
      const startOfMonth = new Date(year, month - 1, 1);
      const startOfNextMonth = new Date(year, month, 1);

      const conditions = [gte(spendings.date, startOfMonth), lt(spendings.date, startOfNextMonth)];

      if (categoryId) {
        conditions.push(eq(spendings.categoryId, categoryId));
      }

      if (search) {
        const term = `%${search}%`;
        const searchCondition = or(like(spendings.merchant, term), like(spendings.note, term));
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      return database
        .select()
        .from(spendings)
        .where(and(...conditions))
        .all();
    },
  };
}

let defaultInstance: SpendingRepository | undefined;

/**
 * Lazily-constructed singleton bound to the real on-device database. Lazy so
 * importing this module (e.g. for its types/factory in tests that inject their
 * own test database) never opens the native expo-sqlite connection — only
 * calling this function does.
 */
export function getSpendingRepository(): SpendingRepository {
  if (!defaultInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, see above
    const { db } = require('./db') as typeof import('./db');
    defaultInstance = createSpendingRepository(db);
  }

  return defaultInstance;
}
