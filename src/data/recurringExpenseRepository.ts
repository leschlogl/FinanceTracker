import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';
import { recurringExpenses } from './schema';

export interface RecurringExpense {
  id: string;
  name: string;
  // Minor currency units (e.g. cents) — see comment on schema.spendings.amount.
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  active: boolean;
}

export interface CreateRecurringExpenseInput {
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  active?: boolean;
}

export interface UpdateRecurringExpenseInput {
  name?: string;
  amount?: number;
  categoryId?: string;
  dayOfMonth?: number;
  active?: boolean;
}

export interface RecurringExpenseRepository {
  create(input: CreateRecurringExpenseInput): Promise<RecurringExpense>;
  update(id: string, input: UpdateRecurringExpenseInput): Promise<RecurringExpense>;
  delete(id: string): Promise<void>;
  listActive(): Promise<RecurringExpense[]>;
}

type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>;

export function createRecurringExpenseRepository(
  database: AppDatabase,
): RecurringExpenseRepository {
  return {
    async create(input) {
      const [row] = await database
        .insert(recurringExpenses)
        .values({
          id: crypto.randomUUID(),
          name: input.name,
          amount: input.amount,
          categoryId: input.categoryId,
          dayOfMonth: input.dayOfMonth,
          active: input.active ?? true,
        })
        .returning();

      return row;
    },

    async update(id, input) {
      const [row] = await database
        .update(recurringExpenses)
        .set(input)
        .where(eq(recurringExpenses.id, id))
        .returning();

      if (!row) {
        throw new Error(`Recurring expense not found: ${id}`);
      }

      return row;
    },

    async delete(id) {
      await database.delete(recurringExpenses).where(eq(recurringExpenses.id, id)).run();
    },

    async listActive() {
      return database
        .select()
        .from(recurringExpenses)
        .where(eq(recurringExpenses.active, true))
        .all();
    },
  };
}

let defaultInstance: RecurringExpenseRepository | undefined;

/**
 * Lazily-constructed singleton bound to the real on-device database. Lazy so
 * importing this module (e.g. for its types/factory in tests that inject their
 * own test database) never opens the native expo-sqlite connection — only
 * calling this function does.
 */
export function getRecurringExpenseRepository(): RecurringExpenseRepository {
  if (!defaultInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, see above
    const { db } = require('./db') as typeof import('./db');
    defaultInstance = createRecurringExpenseRepository(db);
  }

  return defaultInstance;
}
