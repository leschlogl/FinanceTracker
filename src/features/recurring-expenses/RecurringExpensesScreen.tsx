import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, View } from 'react-native';

import type { CategoryRepository } from '@/data/categoryRepository';
import type {
  RecurringExpense,
  RecurringExpenseRepository,
} from '@/data/recurringExpenseRepository';
import { Card, EmptyState, IconButton, Screen, Text, colors } from '@/design-system';
import { useCategories } from '@/features/categories/useCategories';
import { formatCurrency } from '@/lib/currency';

import { DEFAULT_CURRENCY_FALLBACK } from './generation';
import {
  RecurringExpenseFormModal,
  type RecurringExpenseFormValues,
} from './RecurringExpenseFormModal';
import { useRecurringExpenses } from './useRecurringExpenses';

type RecurringExpensesScreenProps = {
  /** Overridable for tests; defaults to the real on-device repository. */
  repository?: RecurringExpenseRepository;
  /** Overridable for tests; defaults to the real on-device repository. */
  categoryRepository?: CategoryRepository;
};

export function RecurringExpensesScreen({
  repository,
  categoryRepository,
}: RecurringExpensesScreenProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { categories } = useCategories(categoryRepository);
  const {
    recurringExpenses,
    error,
    addRecurringExpense,
    updateRecurringExpense,
    removeRecurringExpense,
  } = useRecurringExpenses(repository);
  const primaryColor = colorScheme === 'dark' ? colors.dark.primary : colors.light.primary;
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);

  function openAddForm() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEditForm(recurringExpense: RecurringExpense) {
    setEditing(recurringExpense);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditing(null);
  }

  async function handleSubmit(values: RecurringExpenseFormValues) {
    const ok = editing
      ? await updateRecurringExpense(editing.id, values)
      : await addRecurringExpense(values);

    if (ok) {
      closeForm();
    }
  }

  function confirmDelete(recurringExpense: RecurringExpense) {
    Alert.alert(
      t('recurringExpenses.deleteConfirmTitle'),
      t('recurringExpenses.deleteConfirmMessage', { name: recurringExpense.name }),
      [
        { text: t('recurringExpenses.deleteConfirmCancel'), style: 'cancel' },
        {
          text: t('recurringExpenses.deleteConfirmConfirm'),
          style: 'destructive',
          onPress: () => removeRecurringExpense(recurringExpense.id),
        },
      ],
    );
  }

  function categoryFor(categoryId: string) {
    return categories.find((category) => category.id === categoryId);
  }

  return (
    <Screen>
      <FlatList
        data={recurringExpenses}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={
          <Text variant="title" className="mb-2">
            {t('recurringExpenses.title')}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="arrow.triangle.2.circlepath"
            title={t('recurringExpenses.emptyTitle')}
            message={t('recurringExpenses.emptyMessage')}
          />
        }
        renderItem={({ item }) => {
          const category = categoryFor(item.categoryId);

          return (
            <Card className="flex-row items-center gap-3">
              {category ? (
                <SymbolView name={category.icon as SFSymbol} size={20} tintColor={category.color} />
              ) : null}
              <View className="flex-1 gap-1">
                <Text variant="body">{item.name}</Text>
                <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
                  {t('recurringExpenses.rowSubtitle', {
                    amount: formatCurrency(item.amount, DEFAULT_CURRENCY_FALLBACK),
                    day: item.dayOfMonth,
                  })}
                </Text>
              </View>
              <IconButton
                name="pencil"
                accessibilityLabel={t('recurringExpenses.editAccessibilityLabel', {
                  name: item.name,
                })}
                size={18}
                onPress={() => openEditForm(item)}
              />
              <IconButton
                name="trash"
                accessibilityLabel={t('recurringExpenses.deleteAccessibilityLabel', {
                  name: item.name,
                })}
                size={18}
                onPress={() => confirmDelete(item)}
              />
            </Card>
          );
        }}
      />

      {error ? (
        <Text
          variant="caption"
          className="px-4 pb-2 text-center text-red-500 dark:text-red-400"
          accessibilityRole="alert"
        >
          {t(`recurringExpenses.error${error.charAt(0).toUpperCase()}${error.slice(1)}`)}
        </Text>
      ) : null}

      <IconButton
        name="plus.circle.fill"
        accessibilityLabel={t('recurringExpenses.addButton')}
        size={44}
        tintColor={primaryColor}
        className="absolute bottom-6 right-6"
        onPress={openAddForm}
      />

      <RecurringExpenseFormModal
        visible={formVisible}
        categories={categories}
        initialValues={
          editing
            ? {
                name: editing.name,
                amount: editing.amount,
                categoryId: editing.categoryId,
                dayOfMonth: editing.dayOfMonth,
              }
            : null
        }
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />
    </Screen>
  );
}
