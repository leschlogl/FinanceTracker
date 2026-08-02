import { useLocalSearchParams } from 'expo-router';

import { ConfirmSpendScreen } from '@/features/spendings/ConfirmSpendScreen';

// Matches the ApplePay capture deep link contract in PRODUCT_SPEC.md
// (`financetracker://add-spend?amount=&merchant=&currency=`) — Expo Router
// resolves that link straight to this route with the query params already
// parsed, so no extra deep-link handling is needed here. Feature 2.1 (the
// Shortcuts automation itself) isn't built yet, but this route already works
// standalone whether opened with those params or with none (plain manual
// entry) — see docs/features/03-manual-spend-entry.md.
export default function AddSpendRoute() {
  const params = useLocalSearchParams<{ amount?: string; merchant?: string; currency?: string }>();

  return (
    <ConfirmSpendScreen
      initialValues={{
        amount: params.amount,
        merchant: params.merchant,
        currency: params.currency,
      }}
    />
  );
}
