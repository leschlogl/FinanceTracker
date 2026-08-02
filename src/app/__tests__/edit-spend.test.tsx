import { cleanup, renderRouter } from 'expo-router/testing-library';

import '@/lib/i18n';
import { getCategoryRepository } from '@/data/categoryRepository';
import { getSpendingRepository } from '@/data/spendingRepository';

import EditSpendRoute from '../edit-spend/[id]';

// See src/app/__tests__/add-spend.test.tsx for why src/data/db.ts is mocked
// here: it opens a real expo-sqlite native connection, unavailable under
// Jest/Node, so this swaps in a better-sqlite3-backed db at the same
// `require('./db')` seam the getXRepository() singletons already use — the
// /edit-spend/[id] route renders through its real, unmodified production
// code path end-to-end. Written after the imports above; jest hoists
// `jest.mock` calls above them automatically.
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

// Verifies the /edit-spend/[id] route directly via renderRouter + a real
// path param, per docs/features/03-manual-spend-entry.md's "verify via
// direct navigation/deep link in tests, not via a button you build". The
// save round trip itself (edit -> repository.update -> read back) is already
// covered against the real repository in
// src/features/spendings/__tests__/ConfirmSpendScreen.integration.test.tsx —
// these tests only need to prove the route resolves params to the right
// screen state, not re-prove the save path.
describe('/edit-spend/[id] route', () => {
  // renderRouter mounts a full ExpoRoot tree and internally switches to fake
  // timers; without cleanup + real timers between tests, a tree left mounted
  // from a previous test can interfere with the next one's queries.
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('loads and pre-fills the existing spend for the id in the URL', async () => {
    const food = await getCategoryRepository().create({
      name: 'Groceries',
      color: '#FF9500',
      icon: 'fork.knife',
    });
    const spending = await getSpendingRepository().create({
      amount: 4599,
      currency: 'EUR',
      merchant: 'REWE',
      categoryId: food.id,
      date: new Date(2026, 6, 15),
      source: 'manual',
    });

    const { findByText, findByDisplayValue } = await renderRouter(
      { 'edit-spend/[id]': EditSpendRoute },
      { initialUrl: `/edit-spend/${spending.id}` },
    );

    expect(await findByText('Edit spend')).toBeTruthy();
    expect(await findByDisplayValue('45.99')).toBeTruthy();
    expect(await findByDisplayValue('REWE')).toBeTruthy();
  });

  it('shows a not-found message for an id that does not exist', async () => {
    const { findByText } = await renderRouter(
      { 'edit-spend/[id]': EditSpendRoute },
      { initialUrl: '/edit-spend/does-not-exist' },
    );

    expect(await findByText("This spend couldn't be found.")).toBeTruthy();
  });
});
