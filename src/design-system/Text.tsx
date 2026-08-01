import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography } from './tokens';

type Variant = keyof typeof typography;

type TextProps = RNTextProps & {
  variant?: Variant;
  className?: string;
};

export function Text({ variant = 'body', className = '', ...props }: TextProps) {
  return (
    <RNText
      className={`text-text dark:text-textDark ${typography[variant]} ${className}`}
      {...props}
    />
  );
}
