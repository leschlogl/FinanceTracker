import { OnboardingShortcutsScreen } from '@/features/onboarding/OnboardingShortcutsScreen';

// Temporary standalone route: PRODUCT_SPEC.md says this onboarding screen is
// "reachable from Settings", but Settings (feature 3.2) doesn't exist yet —
// same situation as src/app/categories.tsx (feature 1.1). Linked directly
// from the Settings placeholder screen for now, see src/app/settings.tsx.
// 3.2 should wire the real entry point to this same screen rather than
// duplicating it.
export default function OnboardingShortcutsRoute() {
  return <OnboardingShortcutsScreen />;
}
