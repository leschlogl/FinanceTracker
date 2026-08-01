import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

type ScreenProps = SafeAreaViewProps & {
  className?: string;
};

export function Screen({ className = '', ...props }: ScreenProps) {
  return (
    <SafeAreaView
      className={`flex-1 bg-background dark:bg-backgroundDark ${className}`}
      {...props}
    />
  );
}
