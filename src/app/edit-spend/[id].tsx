import { useLocalSearchParams } from 'expo-router';

import { ConfirmSpendScreen } from '@/features/spendings/ConfirmSpendScreen';

export default function EditSpendRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ConfirmSpendScreen spendingId={id} />;
}
