import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';

import type { CategoryRepository } from '@/data/categoryRepository';
import type {
  CreateSpendingInput,
  Spending,
  SpendingRepository,
  UpdateSpendingInput,
} from '@/data/spendingRepository';
import { Button, CategoryPicker, Input, Screen, Text } from '@/design-system';
import { useCategories } from '@/features/categories/useCategories';
import { minorUnitsToInputValue, parseAmountInput } from '@/lib/currency';

import { useSpending } from './useSpending';

// No Settings screen (Feature 3.2) exists yet to source the user's configured
// currency from, so this is a hardcoded fallback until then — a known,
// intentionally temporary shortcut (see docs/features/03-manual-spend-entry.md,
// "Key implementation notes"). Feature 3.2 should replace this with the real
// setting; no currency picker UI is built here.
const DEFAULT_CURRENCY_FALLBACK = 'EUR';

export type ConfirmSpendInitialValues = {
  amount?: string;
  merchant?: string;
  currency?: string;
  categoryId?: string;
  date?: Date;
  note?: string;
};

type ConfirmSpendScreenProps = {
  /** Presence => editing an existing spend; absence => creating a new one. */
  spendingId?: string;
  /**
   * Seeds the form when creating — e.g. the ApplePay capture deep link's
   * amount/merchant/currency hints (Feature 2.1) land here as just another
   * set of initial values, the same code path as a blank manual entry.
   * Ignored once editing an existing spend, whose own saved values are
   * loaded from the repository instead.
   */
  initialValues?: ConfirmSpendInitialValues;
  repository?: SpendingRepository;
  categoryRepository?: CategoryRepository;
  /** Called after a successful save/delete. Defaults to `router.back()`. */
  onDone?: () => void;
};

function dateToInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function spendingToInitialValues(spending: Spending): ConfirmSpendInitialValues {
  return {
    amount: minorUnitsToInputValue(spending.amount),
    merchant: spending.merchant ?? undefined,
    currency: spending.currency,
    categoryId: spending.categoryId,
    date: spending.date,
    note: spending.note ?? undefined,
  };
}

/**
 * Loads the existing spend for edit mode (if any), then hands off to
 * `ConfirmSpendForm` once the resolved initial values are known. Create mode
 * has nothing to load, so it renders the form immediately.
 */
export function ConfirmSpendScreen({
  spendingId,
  initialValues,
  repository,
  categoryRepository,
  onDone,
}: ConfirmSpendScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { spending, loading, error, createSpending, updateSpending, deleteSpending } = useSpending(
    spendingId,
    repository,
  );

  function handleDone() {
    if (onDone) {
      onDone();
    } else {
      router.back();
    }
  }

  if (spendingId && loading) {
    return (
      <Screen>
        <Text className="p-4">{t('confirmSpend.loading')}</Text>
      </Screen>
    );
  }

  if (spendingId && !loading && !spending) {
    return (
      <Screen>
        <Text className="p-4">{t('confirmSpend.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <ConfirmSpendForm
      spendingId={spendingId}
      initialValues={spending ? spendingToInitialValues(spending) : initialValues}
      error={error}
      categoryRepository={categoryRepository}
      createSpending={createSpending}
      updateSpending={updateSpending}
      deleteSpending={deleteSpending}
      onDone={handleDone}
    />
  );
}

type ConfirmSpendFormProps = {
  spendingId?: string;
  initialValues?: ConfirmSpendInitialValues;
  error: string | null;
  categoryRepository?: CategoryRepository;
  createSpending: (input: CreateSpendingInput) => Promise<Spending | null>;
  updateSpending: (id: string, input: UpdateSpendingInput) => Promise<Spending | null>;
  deleteSpending: (id: string) => Promise<boolean>;
  onDone: () => void;
};

// All local form state initializes directly from `initialValues` at mount —
// the same "no effect-based reset" pattern as
// src/features/categories/CategoryFormModal.tsx (see its comment) — rather
// than syncing from a loaded spend via a useEffect. By the time this renders,
// ConfirmSpendScreen has already resolved `initialValues` (either the
// deep-link/create-mode hints or the loaded spend's own values).
function ConfirmSpendForm({
  spendingId,
  initialValues,
  error,
  categoryRepository,
  createSpending,
  updateSpending,
  deleteSpending,
  onDone,
}: ConfirmSpendFormProps) {
  const { t } = useTranslation();
  const { categories } = useCategories(categoryRepository);

  const [amountText, setAmountText] = useState(initialValues?.amount ?? '');
  const [merchant, setMerchant] = useState(initialValues?.merchant ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [dateText, setDateText] = useState(dateToInputValue(initialValues?.date ?? new Date()));
  const [note, setNote] = useState(initialValues?.note ?? '');
  const [currency] = useState(initialValues?.currency ?? DEFAULT_CURRENCY_FALLBACK);
  const [touched, setTouched] = useState(false);

  const parsedAmount = parseAmountInput(amountText);
  const parsedDate = parseDateInput(dateText);
  const amountError = touched && parsedAmount === null ? t('confirmSpend.amountError') : undefined;
  const categoryError = touched && !categoryId ? t('confirmSpend.categoryError') : undefined;
  const dateError = touched && !parsedDate ? t('confirmSpend.dateError') : undefined;

  async function handleSave() {
    if (parsedAmount === null || !categoryId || !parsedDate) {
      setTouched(true);
      return;
    }

    const saved = spendingId
      ? await updateSpending(spendingId, {
          amount: parsedAmount,
          currency,
          merchant: merchant.trim() || null,
          categoryId,
          date: parsedDate,
          note: note.trim() || null,
        })
      : await createSpending({
          amount: parsedAmount,
          currency,
          merchant: merchant.trim() || null,
          categoryId,
          date: parsedDate,
          note: note.trim() || null,
          source: 'manual',
        });

    if (saved) {
      onDone();
    }
  }

  function confirmDelete() {
    if (!spendingId) {
      return;
    }

    Alert.alert(t('confirmSpend.deleteConfirmTitle'), t('confirmSpend.deleteConfirmMessage'), [
      { text: t('confirmSpend.deleteConfirmCancel'), style: 'cancel' },
      {
        text: t('confirmSpend.deleteConfirmConfirm'),
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteSpending(spendingId);
          if (ok) {
            onDone();
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        <Text variant="title">
          {spendingId ? t('confirmSpend.editTitle') : t('confirmSpend.addTitle')}
        </Text>

        <Input
          label={t('confirmSpend.amountLabel')}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={setAmountText}
          onBlur={() => setTouched(true)}
          error={amountError}
        />

        <Input
          label={t('confirmSpend.merchantLabel')}
          placeholder={t('confirmSpend.merchantPlaceholder')}
          value={merchant}
          onChangeText={setMerchant}
        />

        <View className="gap-2">
          <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
            {t('confirmSpend.categoryLabel')}
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
          label={t('confirmSpend.dateLabel')}
          placeholder="YYYY-MM-DD"
          value={dateText}
          onChangeText={setDateText}
          onBlur={() => setTouched(true)}
          error={dateError}
        />

        <Input
          label={t('confirmSpend.noteLabel')}
          placeholder={t('confirmSpend.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          multiline
        />

        {error ? (
          <Text
            variant="caption"
            className="text-center text-red-500 dark:text-red-400"
            accessibilityRole="alert"
          >
            {t('confirmSpend.saveError')}
          </Text>
        ) : null}

        <Button label={t('confirmSpend.save')} onPress={handleSave} />

        {spendingId ? (
          <Button
            label={t('confirmSpend.delete')}
            onPress={confirmDelete}
            className="bg-red-500 dark:bg-red-600"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
