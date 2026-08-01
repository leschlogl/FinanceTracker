import '../global.css';
import '../lib/i18n';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { db } from '@/data/db';
import migrations from '@/data/migrations/migrations';
import { seedDefaultCategories } from '@/data/seedCategories';
import { Text } from '@/design-system';

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
