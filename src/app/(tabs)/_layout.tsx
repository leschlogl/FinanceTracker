import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

// NativeTabs only ever exposes routes declared here as a <NativeTabs.Trigger>
// (expo-router hardcodes useOnlyUserDefinedScreens: true for it) — any other
// route file is invisible to it, not just via deep link but via router.push()
// and <Link> too. That's why this lives in its own (tabs) group nested under
// the root Stack in src/app/_layout.tsx, rather than at the app root: routes
// outside this group (add-spend, categories, edit-spend/[id], etc.) need to
// stay reachable, which a root-level NativeTabs would silently break.
export default function TabsLayout() {
  const { t } = useTranslation();

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
