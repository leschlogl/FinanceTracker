import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';

import type { Category } from '@/data/categoryRepository';
import { Button, Card, CategoryPicker, Input, Text } from '@/design-system';
import { minorUnitsToInputValue, parseAmountInput } from '@/lib/currency';

export type RecurringExpenseFormValues = {
  name: string;
  // Minor currency units, same convention as CreateSpendingInput.amount.
  amount: number;
  categoryId: string;
  dayOfMonth: number;
};

type RecurringExpenseFormModalProps = {
  visible: boolean;
  categories: Category[];
  initialValues?: RecurringExpenseFormValues | null;
  onSubmit: (values: RecurringExpenseFormValues) => void;
  onCancel: () => void;
};

// Only mounted while `visible`, so local form state always initializes fresh
// from `initialValues` on open (add vs. edit) — same "no effect-based reset"
// pattern as src/features/categories/CategoryFormModal.tsx (see its comment).
export function RecurringExpenseFormModal({
  visible,
  categories,
  initialValues,
  onSubmit,
  onCancel,
}: RecurringExpenseFormModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <RecurringExpenseFormModalContent
      categories={categories}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

type RecurringExpenseFormModalContentProps = Omit<RecurringExpenseFormModalProps, 'visible'>;

const MIN_DAY_OF_MONTH = 1;
const MAX_DAY_OF_MONTH = 31;

function RecurringExpenseFormModalContent({
  categories,
  initialValues,
  onSubmit,
  onCancel,
}: RecurringExpenseFormModalContentProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [amountText, setAmountText] = useState(
    initialValues ? minorUnitsToInputValue(initialValues.amount) : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [dayOfMonthText, setDayOfMonthText] = useState(
    initialValues ? String(initialValues.dayOfMonth) : '',
  );
  const [touched, setTouched] = useState(false);

  const parsedAmount = parseAmountInput(amountText);
  const parsedDayOfMonth = Number.parseInt(dayOfMonthText, 10);
  const dayOfMonthValid =
    /^\d+$/.test(dayOfMonthText.trim()) &&
    parsedDayOfMonth >= MIN_DAY_OF_MONTH &&
    parsedDayOfMonth <= MAX_DAY_OF_MONTH;

  const nameError =
    touched && name.trim().length === 0 ? t('recurringExpenses.form.nameRequired') : undefined;
  const amountError =
    touched && parsedAmount === null ? t('recurringExpenses.form.amountError') : undefined;
  const categoryError =
    touched && !categoryId ? t('recurringExpenses.form.categoryError') : undefined;
  const dayOfMonthError =
    touched && !dayOfMonthValid ? t('recurringExpenses.form.dayOfMonthError') : undefined;

  function handleSave() {
    if (name.trim().length === 0 || parsedAmount === null || !categoryId || !dayOfMonthValid) {
      setTouched(true);
      return;
    }

    onSubmit({
      name: name.trim(),
      amount: parsedAmount,
      categoryId,
      dayOfMonth: parsedDayOfMonth,
    });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <Card className="gap-4 rounded-b-none">
          <Text variant="subtitle">
            {initialValues
              ? t('recurringExpenses.form.editTitle')
              : t('recurringExpenses.form.addTitle')}
          </Text>

          <Input
            label={t('recurringExpenses.form.nameLabel')}
            placeholder={t('recurringExpenses.form.namePlaceholder')}
            value={name}
            onChangeText={setName}
            onBlur={() => setTouched(true)}
            error={nameError}
          />

          <Input
            label={t('recurringExpenses.form.amountLabel')}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={setAmountText}
            onBlur={() => setTouched(true)}
            error={amountError}
          />

          <View className="gap-2">
            <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
              {t('recurringExpenses.form.categoryLabel')}
            </Text>
            <CategoryPicker
              categories={categories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
            {categoryError ? (
              <Text variant="caption" className="text-red-500 dark:text-red-400">
                {categoryError}
              </Text>
            ) : null}
          </View>

          <Input
            label={t('recurringExpenses.form.dayOfMonthLabel')}
            placeholder={t('recurringExpenses.form.dayOfMonthPlaceholder')}
            keyboardType="number-pad"
            value={dayOfMonthText}
            onChangeText={setDayOfMonthText}
            onBlur={() => setTouched(true)}
            error={dayOfMonthError}
          />

          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="flex-1 items-center rounded-lg border border-border px-4 py-3 active:opacity-60 dark:border-borderDark"
            >
              <Text variant="body">{t('recurringExpenses.form.cancel')}</Text>
            </Pressable>
            <Button
              label={t('recurringExpenses.form.save')}
              onPress={handleSave}
              className="flex-1"
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
