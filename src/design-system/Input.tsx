import { useColorScheme } from 'nativewind';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { colors } from './tokens';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  className?: string;
};

export function Input({ label, error, className = '', ...props }: InputProps) {
  const { colorScheme } = useColorScheme();
  const placeholderTextColor =
    colorScheme === 'dark' ? colors.dark.textMuted : colors.light.textMuted;

  return (
    <View className="gap-1">
      {label ? (
        <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={placeholderTextColor}
        className={`rounded-lg border bg-surface px-4 py-3 text-base text-text dark:bg-surfaceDark dark:text-textDark ${
          error ? 'border-red-500 dark:border-red-400' : 'border-border dark:border-borderDark'
        } ${className}`}
        {...props}
      />
      {error ? (
        <Text variant="caption" className="text-red-500 dark:text-red-400">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
