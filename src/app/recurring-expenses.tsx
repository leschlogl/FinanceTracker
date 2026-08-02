import { RecurringExpensesScreen } from '@/features/recurring-expenses/RecurringExpensesScreen';

// Temporary standalone route, same situation as src/app/categories.tsx:
// PRODUCT_SPEC.md surfaces recurring expense management from Settings, but
// Settings (Feature 3.2) doesn't exist yet. Unlike categories.tsx, no link
// into src/app/settings.tsx is added here — this feature's Owns/Extends list
// (docs/features/06-recurring-expenses.md) only names locale files and
// src/app/_layout.tsx, not settings.tsx, so it's left untouched to stay
// inside that boundary. 3.2 should wire the real entry point to this screen;
// until then it's reachable directly via router.push('/recurring-expenses').
export default function RecurringExpensesRoute() {
  return <RecurringExpensesScreen />;
}
