import { Pressable, type PressableProps } from 'react-native';

import { Text } from './Text';

type ButtonProps = PressableProps & {
  label: string;
  className?: string;
};

export function Button({ label, className = '', ...props }: ButtonProps) {
  return (
    <Pressable
      className={`items-center rounded-lg bg-primary px-4 py-3 active:opacity-80 dark:bg-primaryDark ${className}`}
      {...props}
    >
      <Text className="font-semibold text-white" variant="body">
        {label}
      </Text>
    </Pressable>
  );
}
