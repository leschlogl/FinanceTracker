import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
});

export const spendings = sqliteTable('spendings', {
  id: text('id').primaryKey(),
  // Stored in minor currency units (e.g. cents) to avoid float rounding on money.
  amount: integer('amount').notNull(),
  currency: text('currency').notNull(),
  merchant: text('merchant'),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  note: text('note'),
  source: text('source').notNull().$type<'shortcut' | 'manual' | 'recurring'>(),
});

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  dayOfMonth: integer('day_of_month').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});
