import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, SectionList, View } from 'react-native';

import type { CategoryRepository } from '@/data/categoryRepository';
import type { Spending, SpendingRepository } from '@/data/spendingRepository';
import {
  Card,
  CategoryPicker,
  EmptyState,
  IconButton,
  Input,
  Screen,
  Text,
  colors,
} from '@/design-system';
import { useCategories } from '@/features/categories/useCategories';
import { formatCurrency } from '@/lib/currency';

import { useSpending } from './useSpending';
import { useSpendingsList } from './useSpendingsList';

// Debounces the search input before it's wired to
// SpendingRepository.list()'s `search` param, per
// docs/features/04-spendings-list.md ("this feature just wires a search
// input to it, debounced").
const SEARCH_DEBOUNCE_MS = 300;

type SpendingsListScreenProps = {
  /** Overridable for tests; defaults to the real on-device repository. */
  repository?: SpendingRepository;
  categoryRepository?: CategoryRepository;
};

function formatMonthTitle(year: number, month: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

function formatDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

export function SpendingsListScreen({ repository, categoryRepository }: SpendingsListScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const primaryColor = colorScheme === 'dark' ? colors.dark.primary : colors.light.primary;

  const { categories } = useCategories(categoryRepository);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchText]);

  const { sections, error: listError, refresh } = useSpendingsList(
    { categoryId: categoryFilterId, search: debouncedSearch },
    repository,
  );
  const { deleteSpending, error: deleteError } = useSpending(undefined, repository);

  const isFiltering = Boolean(categoryFilterId) || debouncedSearch.trim().length > 0;

  function confirmDelete(spending: Spending) {
    Alert.alert(t('spendings.deleteConfirmTitle'), t('spendings.deleteConfirmMessage'), [
      { text: t('spendings.deleteConfirmCancel'), style: 'cancel' },
      {
        text: t('spendings.deleteConfirmConfirm'),
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteSpending(spending.id);
          if (ok) {
            await refresh();
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4 pb-24"
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            <Text variant="title">{t('spendings.title')}</Text>
            <Input
              placeholder={t('spendings.searchPlaceholder')}
              accessibilityLabel={t('spendings.searchPlaceholder')}
              value={searchText}
              onChangeText={setSearchText}
            />
            {categories.length > 0 ? (
              <View className="gap-2">
                <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
                  {t('spendings.filterLabel')}
                </Text>
                <CategoryPicker
                  categories={categories}
                  selectedId={categoryFilterId}
                  onSelect={(id) =>
                    setCategoryFilterId((current) => (current === id ? null : id))
                  }
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isFiltering ? (
            <EmptyState
              icon="magnifyingglass"
              title={t('spendings.noResultsTitle')}
              message={t('spendings.noResultsMessage')}
            />
          ) : (
            <EmptyState
              icon="list.bullet.rectangle"
              title={t('spendings.emptyTitle')}
              message={t('spendings.emptyMessage')}
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <Text variant="subtitle" className="pb-1 pt-4 text-textMuted dark:text-textMutedDark">
            {formatMonthTitle(section.year, section.month, i18n.language)}
          </Text>
        )}
        renderItem={({ item }) => {
          const category = categoriesById.get(item.categoryId);
          const merchantLabel = item.merchant?.trim() || t('spendings.noMerchant');
          const amountLabel = formatCurrency(item.amount, item.currency, i18n.language);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('spendings.rowAccessibilityLabel', {
                merchant: merchantLabel,
                amount: amountLabel,
              })}
              onPress={() => router.push(`/edit-spend/${item.id}`)}
            >
              <Card className="flex-row items-center gap-3">
                {category ? (
                  <SymbolView
                    name={category.icon as SFSymbol}
                    size={20}
                    tintColor={category.color}
                  />
                ) : null}
                <View className="flex-1 gap-1">
                  <Text variant="body">{merchantLabel}</Text>
                  <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
                    {category ? `${category.name} · ` : ''}
                    {formatDate(item.date, i18n.language)}
                  </Text>
                </View>
                <Text variant="body" className="font-semibold">
                  {amountLabel}
                </Text>
                <IconButton
                  name="trash"
                  accessibilityLabel={t('spendings.deleteAccessibilityLabel', {
                    merchant: merchantLabel,
                  })}
                  size={18}
                  onPress={() => confirmDelete(item)}
                />
              </Card>
            </Pressable>
          );
        }}
      />

      {listError || deleteError ? (
        <Text
          variant="caption"
          className="px-4 pb-2 text-center text-red-500 dark:text-red-400"
          accessibilityRole="alert"
        >
          {listError ? t('spendings.errorLoading') : t('spendings.errorDeleting')}
        </Text>
      ) : null}

      <IconButton
        name="plus.circle.fill"
        accessibilityLabel={t('spendings.addButton')}
        size={44}
        tintColor={primaryColor}
        className="absolute bottom-6 right-6"
        onPress={() => router.push('/add-spend')}
      />
    </Screen>
  );
}
