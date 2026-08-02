import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Card, Screen, Text } from '@/design-system';

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Step-by-step instructions for creating the iOS Shortcuts "Personal
 * Automation" that drives ApplePay capture (see PRODUCT_SPEC.md, "ApplePay
 * capture flow") — the app can't configure this on the user's behalf, so an
 * in-app walkthrough is the only option. Purely static content, no
 * dynamic/loading state, so it's a single component with no hook of its own
 * (unlike e.g. CategoriesScreen).
 *
 * Content verified against the real Shortcuts app (bundle
 * com.apple.shortcuts) on the iOS 26.5 simulator plus Apple's own support
 * docs — as of iOS 26 the automation trigger this relies on is labeled
 * "Wallet" in the Shortcuts UI (it was called "Transaction" pre-iOS 26,
 * introduced iOS 17), so the copy below calls out both names. Re-verify this
 * wording if a future iOS release renames it again.
 */
export function OnboardingShortcutsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Text variant="title">{t('onboardingShortcuts.title')}</Text>
        <Text className="text-textMuted dark:text-textMutedDark">
          {t('onboardingShortcuts.intro')}
        </Text>

        {STEP_NUMBERS.map((step) => (
          <Card key={step} className="gap-1">
            <Text variant="subtitle">{t(`onboardingShortcuts.step${step}Title`)}</Text>
            <Text>{t(`onboardingShortcuts.step${step}Body`)}</Text>
          </Card>
        ))}

        <View className="gap-1">
          <Text variant="subtitle">{t('onboardingShortcuts.footerTitle')}</Text>
          <Text className="text-textMuted dark:text-textMutedDark">
            {t('onboardingShortcuts.footerBody')}
          </Text>
        </View>

        <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
          {t('onboardingShortcuts.manualFallback')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
