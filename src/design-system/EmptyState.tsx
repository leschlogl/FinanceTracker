import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useColorScheme } from 'nativewind';
import { View, type ViewProps } from 'react-native';

import { Text } from './Text';
import { colors } from './tokens';

type EmptyStateProps = ViewProps & {
  icon?: SFSymbol;
  title: string;
  message?: string;
  className?: string;
};

export function EmptyState({ icon, title, message, className = '', ...props }: EmptyStateProps) {
  const { colorScheme } = useColorScheme();
  const iconTintColor = colorScheme === 'dark' ? colors.dark.textMuted : colors.light.textMuted;

  return (
    <View className={`items-center justify-center gap-2 p-8 ${className}`} {...props}>
      {icon ? <SymbolView name={icon} size={40} tintColor={iconTintColor} /> : null}
      <Text variant="subtitle" className="text-center">
        {title}
      </Text>
      {message ? (
        <Text variant="caption" className="text-center text-textMuted dark:text-textMutedDark">
          {message}
        </Text>
      ) : null}
    </View>
  );
}
