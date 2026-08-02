import '../global.css';
import '../lib/i18n';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { db } from '@/data/db';
import migrations from '@/data/migrations/migrations';
import { seedDefaultCategories } from '@/data/seedCategories';
import { Text } from '@/design-system';
import { runRecurringExpenseGeneration } from '@/features/recurring-expenses/runRecurringExpenseGeneration';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (success) {
      seedDefaultCategories().then(() => setSeeded(true));
    }
  }, [success]);

  useEffect(() => {
    if (error || (success && seeded)) {
      SplashScreen.hideAsync();
    }
  }, [success, error, seeded]);

  // Recurring-expense generation (Feature 2.2) runs after category seeding
  // completes, not before/in parallel with it — a recurring expense's
  // categoryId must already exist in the categories table (default-seeded or
  // user-created) before a generated spend referencing it can be inserted.
  // Runs once on this cold start (app launch counts as "coming to the
  // foreground"), then again on every subsequent return from background.
  // Re-running on every foreground is safe: generation is idempotent per
  // period (see src/features/recurring-expenses/generation.ts), and this is
  // exactly what catches a period becoming due while the app was merely
  // backgrounded rather than relaunched.
  useEffect(() => {
    if (!seeded) {
      return;
    }

    runRecurringExpenseGeneration().catch(() => {
      // Best-effort background task — a failure here (e.g. a transient
      // SQLite error) shouldn't crash app startup or foreground resume.
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        runRecurringExpenseGeneration().catch(() => {
          // See comment above.
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [seeded]);

  if (error) {
    return (
      <Text className="flex-1 items-center justify-center">Migration error: {error.message}</Text>
    );
  }

  if (!success || !seeded) {
    return null;
  }

  // The tab bar itself lives in the (tabs) group's own _layout.tsx (see its
  // comment) — NativeTabs must not be the root layout, since it hardcodes
  // useOnlyUserDefinedScreens: true and would make every other route file
  // (add-spend, categories, edit-spend/[id], etc.) unreachable. Everything
  // outside the (tabs) group is auto-discovered by Stack from the file
  // system, no explicit <Stack.Screen> needed per route.
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
