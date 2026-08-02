import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, View, type ViewProps } from 'react-native';

import type { Category } from '@/data/categoryRepository';

import { Text } from './Text';

type CategoryPickerProps = ViewProps & {
  categories: Category[];
  selectedId?: string | null;
  onSelect: (categoryId: string) => void;
  className?: string;
};

/**
 * Given a list of categories, lets the user pick one. Standalone/reusable so
 * both manual spend entry and recurring expenses can compose it directly,
 * rather than each feature re-implementing a category selector.
 */
export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  className = '',
  ...props
}: CategoryPickerProps) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${className}`} {...props}>
      {categories.map((category) => {
        const selected = category.id === selectedId;

        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={category.name}
            accessibilityState={{ selected }}
            onPress={() => onSelect(category.id)}
            className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${
              selected
                ? 'border-primary dark:border-primaryDark'
                : 'border-border dark:border-borderDark'
            }`}
          >
            <SymbolView name={category.icon as SFSymbol} size={16} tintColor={category.color} />
            <Text variant="caption">{category.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
