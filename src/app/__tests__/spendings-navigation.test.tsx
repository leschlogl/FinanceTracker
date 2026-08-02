import { fireEvent } from '@testing-library/react-native';
import { cleanup, renderRouter } from 'expo-router/testing-library';

import '@/lib/i18n';
import { getCategoryRepository } from '@/data/categoryRepository';
import { getSpendingRepository } from '@/data/spendingRepository';

import EditSpendRoute from '../edit-spend/[id]';
import SpendingsRoute from '../spendings';

// Same db mock as src/app/__tests__/spendings.test.tsx (see its comment) —
// duplicated in its own file rather than shared because this test
// deliberately completes a real navigation (tapping a row to reach
// /edit-spend/[id]) via renderRouter, and renderRouter's underlying
// navigation state doesn't reset cleanly between multiple completed
// navigations within a single test file (observed: a second renderRouter()
// call in the same file after a completed navigation silently fails to find
// elements on the fresh route). One test per file sidesteps that.
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

describe('/spendings row navigation', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('navigates to /edit-spend/[id] with the real route when a row is tapped', async () => {
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

    const { findByText, findByLabelText, findByDisplayValue } = await renderRouter(
      { spendings: SpendingsRoute, 'edit-spend/[id]': EditSpendRoute },
      { initialUrl: '/spendings' },
    );

    await findByText('REWE');
    fireEvent.press(await findByLabelText('Edit spend: REWE, €45.99'));

    expect(await findByText('Edit spend')).toBeTruthy();
    expect(await findByDisplayValue('45.99')).toBeTruthy();
  });
});
