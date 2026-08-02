import { CategoriesScreen } from '@/features/categories/CategoriesScreen';

// Temporary standalone route: PRODUCT_SPEC.md surfaces category management
// from Settings, but Settings (feature 3.2) doesn't exist yet. Linked
// directly from the Settings placeholder screen for now — see
// src/app/(tabs)/settings.tsx. 3.2 should wire the real entry point to this same
// screen rather than duplicating it.
export default function CategoriesRoute() {
  return <CategoriesScreen />;
}
