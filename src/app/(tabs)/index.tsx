import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/design-system';

export default function DashboardScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background dark:bg-backgroundDark">
      <Text variant="title">{t('tabs.dashboard')}</Text>
      <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
        Current month + yearly view coming soon
      </Text>
    </SafeAreaView>
  );
}
