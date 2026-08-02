import { cleanup, renderRouter } from 'expo-router/testing-library';

import '@/lib/i18n';
import { getCategoryRepository } from '@/data/categoryRepository';

import AddSpendRoute from '../add-spend';

// Verifies the ApplePay capture deep link contract end-to-end — see
// PRODUCT_SPEC.md's "ApplePay capture flow" and
// docs/features/05-applepay-shortcuts-capture.md's acceptance criteria
// ("Tests cover: deep link with all params, with no params, with partial
// params — Confirm Spend screen renders sensibly in each case"). All params
// are best-effort per spec, so Shortcuts may hand back any subset of them.
//
// This is a new file rather than an addition to
// src/app/__tests__/add-spend.test.tsx (Feature 1.2's) specifically so this
// feature doesn't need to touch that file. Same db-mocking approach as that
// file — see its comment for why — so /add-spend renders through its real,
// unmodified production code end-to-end without a native SQLite binding.
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

describe('ApplePay Shortcuts deep link contract (financetracker://add-spend)', () => {
  beforeAll(async () => {
    await getCategoryRepository().create({ name: 'Food', color: '#FF9500', icon: 'fork.knife' });
  });

  // renderRouter mounts a full ExpoRoot tree and internally switches to fake
  // timers; without cleanup + real timers between tests, a tree left mounted
  // from a previous test can interfere with the next one's queries (same
  // note as add-spend.test.tsx).
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('pre-fills amount, merchant, and currency when Shortcuts captures all of them', async () => {
    const { findByDisplayValue } = await renderRouter(
      { 'add-spend': AddSpendRoute },
      { initialUrl: '/add-spend?amount=12.99&merchant=REWE&currency=USD' },
    );

    expect(await findByDisplayValue('12.99')).toBeTruthy();
    expect(await findByDisplayValue('REWE')).toBeTruthy();
  });

  it('renders a normal blank form when Shortcuts supplies no params at all', async () => {
    const { findByText, findByPlaceholderText } = await renderRouter(
      { 'add-spend': AddSpendRoute },
      { initialUrl: '/add-spend' },
    );

    expect(await findByText('Add spend')).toBeTruthy();
    expect((await findByPlaceholderText('0.00')).props.value).toBe('');
    expect((await findByPlaceholderText('e.g. REWE')).props.value).toBe('');
  });

  it('pre-fills only the params Shortcuts actually captured, leaving the rest blank', async () => {
    const { findByDisplayValue, findByPlaceholderText } = await renderRouter(
      { 'add-spend': AddSpendRoute },
      { initialUrl: '/add-spend?amount=7.50' },
    );

    expect(await findByDisplayValue('7.50')).toBeTruthy();
    expect((await findByPlaceholderText('e.g. REWE')).props.value).toBe('');
  });

  it('ignores an empty-string merchant param rather than rendering the literal text', async () => {
    const { findByDisplayValue, findByPlaceholderText } = await renderRouter(
      { 'add-spend': AddSpendRoute },
      { initialUrl: '/add-spend?amount=3.20&merchant=' },
    );

    expect(await findByDisplayValue('3.20')).toBeTruthy();
    expect((await findByPlaceholderText('e.g. REWE')).props.value).toBe('');
  });
});
