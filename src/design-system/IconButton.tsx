import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useColorScheme } from 'nativewind';
import { Pressable, type PressableProps } from 'react-native';

import { colors } from './tokens';

type IconButtonProps = PressableProps & {
  name: SFSymbol;
  accessibilityLabel: string;
  size?: number;
  tintColor?: string;
  className?: string;
};

export function IconButton({
  name,
  accessibilityLabel,
  size = 24,
  tintColor,
  className = '',
  ...props
}: IconButtonProps) {
  const { colorScheme } = useColorScheme();
  const resolvedTintColor =
    tintColor ?? (colorScheme === 'dark' ? colors.dark.text : colors.light.text);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`items-center justify-center rounded-full p-2 active:opacity-60 ${className}`}
      {...props}
    >
      <SymbolView name={name} size={size} tintColor={resolvedTintColor} />
    </Pressable>
  );
}
