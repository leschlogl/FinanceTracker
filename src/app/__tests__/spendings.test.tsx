import { cleanup, renderRouter } from 'expo-router/testing-library';

import '@/lib/i18n';
import { getCategoryRepository } from '@/data/categoryRepository';
import { getSpendingRepository } from '@/data/spendingRepository';

import SpendingsRoute from '../spendings';

// See src/app/__tests__/add-spend.test.tsx for why src/data/db.ts is mocked
// here: it opens a real expo-sqlite native connection, unavailable under
// Jest/Node, so this swaps in a better-sqlite3-backed db at the same
// `require('./db')` seam the getXRepository() singletons already use — the
// /spendings route (this feature's actual deliverable) renders through its
// real, unmodified production code path end-to-end. Written after the
// imports above; jest hoists `jest.mock` calls above them automatically.
//
// Navigation *through* /spendings into /edit-spend/[id] and /add-spend is
// covered separately: src/app/__tests__/spendings-navigation.test.tsx (real
// routes, one test per file — renderRouter's shared navigation state doesn't
// reset cleanly across multiple completed navigations within one test file)
// and src/features/spendings/__tests__/SpendingsListScreen.test.tsx (mocked
// router, exercises every navigation call directly). This file only needs to
// prove /spendings itself renders real repository data correctly.
jest.mock('../../data/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const Database = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('node:path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require('../../data/schema');

  const sqlite = new Database(':memory:');
  const migrationSql = readFileSync(
    join(__dirname, '../../data/migrations/0000_glossy_synch.sql'),
    'utf-8',
  );
  sqlite.exec(migrationSql.replace(/-->\s*statement-breakpoint/g, ''));

  return { db: drizzle(sqlite, { schema }) };
});

describe('/spendings route', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('shows the empty state when there are no spendings', async () => {
    await getCategoryRepository().create({ name: 'Food', color: '#FF9500', icon: 'fork.knife' });

    const { findByText } = await renderRouter(
      { spendings: SpendingsRoute },
      { initialUrl: '/spendings' },
    );

    expect(await findByText('No spendings yet')).toBeTruthy();
  });

  it('renders an existing spending with its merchant, category, and amount', async () => {
    const food = await getCategoryRepository().create({
      name: 'Groceries',
      color: '#FF9500',
      icon: 'fork.knife',
    });
    await getSpendingRepository().create({
      amount: 4599,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId: food.id,
      date: new Date(),
      source: 'manual',
    });

    const { findByText } = await renderRouter(
      { spendings: SpendingsRoute },
      { initialUrl: '/spendings' },
    );

    expect(await findByText('REWE')).toBeTruthy();
    expect(await findByText('€45.99')).toBeTruthy();
  });
});
