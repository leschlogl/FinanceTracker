import { cleanup, renderRouter } from 'expo-router/testing-library';

import '@/lib/i18n';
import { getCategoryRepository } from '@/data/categoryRepository';

import AddSpendRoute from '../add-spend';

// src/data/db.ts opens a real expo-sqlite native connection, which isn't
// available under Jest/Node — the repository tests under src/data/__tests__/
// sidestep this at the repository layer by swapping in a better-sqlite3 db;
// here the same swap happens one level up, at the getCategoryRepository()/
// getSpendingRepository() singletons' `require('./db')` (see
// src/data/categoryRepository.ts / spendingRepository.ts), so the /add-spend
// route (this feature's actual deliverable) renders through its real,
// unmodified production code path end-to-end — deep-link query params
// included — without needing a native SQLite binding. Written after the
// imports above; jest hoists `jest.mock` calls above them automatically.
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

// Verifies the /add-spend route directly (via renderRouter + a deep-link-style
// initialUrl) rather than through a button, per
// docs/features/03-manual-spend-entry.md ("this feature only needs to make
// sure /add-spend and /edit-spend/[id] exist and work correctly in isolation
// — verify via direct navigation/deep link in tests, not via a button you
// build"). The route is what `financetracker://add-spend?amount=&merchant=&
// currency=` (see PRODUCT_SPEC.md's ApplePay capture flow) resolves to, so an
// initialUrl with those query params exercises the same param parsing a real
// deep link would.
describe('/add-spend route', () => {
  beforeAll(async () => {
    await getCategoryRepository().create({ name: 'Food', color: '#FF9500', icon: 'fork.knife' });
  });

  // renderRouter mounts a full ExpoRoot tree and internally switches to fake
  // timers; without cleanup + real timers between tests, a tree left mounted
  // from a previous test can interfere with the next one's queries.
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('renders the Confirm Spend screen in create mode with no params', async () => {
    const { findByText } = await renderRouter(
      { 'add-spend': AddSpendRoute },
      { initialUrl: '/add-spend' },
    );

    expect(await findByText('Add spend')).toBeTruthy();
    expect(await findByText('Food')).toBeTruthy();
  });

  it('pre-fills amount/merchant/currency from deep-link-style query params', async () => {
    const { findByDisplayValue } = await renderRouter(
      { 'add-spend': AddSpendRoute },
      { initialUrl: '/add-spend?amount=12.50&merchant=Starbucks&currency=USD' },
    );

    expect(await findByDisplayValue('12.50')).toBeTruthy();
    expect(await findByDisplayValue('Starbucks')).toBeTruthy();
  });
});
