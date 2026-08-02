import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList } from 'react-native';

import { OTHER_CATEGORY_ID, type Category, type CategoryRepository } from '@/data/categoryRepository';
import { Card, EmptyState, IconButton, Screen, Text, colors } from '@/design-system';

import { CategoryFormModal, type CategoryFormValues } from './CategoryFormModal';
import { useCategories } from './useCategories';

type CategoriesScreenProps = {
  /** Overridable for tests; defaults to the real on-device repository. */
  repository?: CategoryRepository;
};

export function CategoriesScreen({ repository }: CategoriesScreenProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { categories, error, addCategory, updateCategory, removeCategory } =
    useCategories(repository);
  const primaryColor = colorScheme === 'dark' ? colors.dark.primary : colors.light.primary;
  const [formVisible, setFormVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  function openAddForm() {
    setEditingCategory(null);
    setFormVisible(true);
  }

  function openEditForm(category: Category) {
    setEditingCategory(category);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditingCategory(null);
  }

  async function handleSubmit(values: CategoryFormValues) {
    const ok = editingCategory
      ? await updateCategory(editingCategory.id, values)
      : await addCategory(values);

    if (ok) {
      closeForm();
    }
  }

  function confirmDelete(category: Category) {
    Alert.alert(
      t('categories.deleteConfirmTitle'),
      t('categories.deleteConfirmMessage', { name: category.name }),
      [
        { text: t('categories.deleteConfirmCancel'), style: 'cancel' },
        {
          text: t('categories.deleteConfirmConfirm'),
          style: 'destructive',
          onPress: () => removeCategory(category.id),
        },
      ],
    );
  }

  return (
    <Screen>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={
          <Text variant="title" className="mb-2">
            {t('categories.title')}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="tag.fill"
            title={t('categories.emptyTitle')}
            message={t('categories.emptyMessage')}
          />
        }
        renderItem={({ item }) => (
          <Card className="flex-row items-center gap-3">
            <SymbolView name={item.icon as SFSymbol} size={20} tintColor={item.color} />
            <Text variant="body" className="flex-1">
              {item.name}
            </Text>
            <IconButton
              name="pencil"
              accessibilityLabel={t('categories.editAccessibilityLabel', { name: item.name })}
              size={18}
              onPress={() => openEditForm(item)}
            />
            {item.id !== OTHER_CATEGORY_ID ? (
              <IconButton
                name="trash"
                accessibilityLabel={t('categories.deleteAccessibilityLabel', { name: item.name })}
                size={18}
                onPress={() => confirmDelete(item)}
              />
            ) : null}
          </Card>
        )}
      />

      {error ? (
        <Text
          variant="caption"
          className="px-4 pb-2 text-center text-red-500 dark:text-red-400"
          accessibilityRole="alert"
        >
          {t(`categories.error${error.charAt(0).toUpperCase()}${error.slice(1)}`)}
        </Text>
      ) : null}

      <IconButton
        name="plus.circle.fill"
        accessibilityLabel={t('categories.addButton')}
        size={44}
        tintColor={primaryColor}
        className="absolute bottom-6 right-6"
        onPress={openAddForm}
      />

      <CategoryFormModal
        visible={formVisible}
        initialValues={
          editingCategory
            ? {
                name: editingCategory.name,
                color: editingCategory.color,
                icon: editingCategory.icon as SFSymbol,
              }
            : null
        }
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />
    </Screen>
  );
}
