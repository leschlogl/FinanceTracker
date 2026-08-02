import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/design-system';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background dark:bg-backgroundDark">
      <Text variant="title">{t('tabs.settings')}</Text>
      <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
        Currency, language, appearance, and categories coming soon
      </Text>
      {/* Temporary until Settings (feature 3.2) wires the real entry point,
          see docs/features/02-categories-management.md */}
      <Link href="/categories" asChild>
        <Pressable accessibilityRole="link">
          <Text variant="body" className="text-primary underline dark:text-primaryDark">
            {t('settings.manageCategories')}
          </Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
