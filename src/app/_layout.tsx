import '../global.css';
import '../lib/i18n';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { db } from '@/data/db';
import migrations from '@/data/migrations/migrations';
import { seedDefaultCategories } from '@/data/seedCategories';
import { Text } from '@/design-system';
import { runRecurringExpenseGeneration } from '@/features/recurring-expenses/runRecurringExpenseGeneration';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { t } = useTranslation();
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

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="chart.pie.fill" />
        <NativeTabs.Trigger.Label>{t('tabs.dashboard')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spendings">
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" />
        <NativeTabs.Trigger.Label>{t('tabs.spendings')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" />
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
