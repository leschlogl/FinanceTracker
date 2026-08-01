// Mirrors the `colors` extension in tailwind.config.js — keep both in sync.
// TS export exists for code that needs raw values outside NativeWind classNames
// (native APIs like StatusBar, chart libraries, etc.).
export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F7',
    text: '#11181C',
    textMuted: '#687076',
    primary: '#0A7EA4',
    border: '#E6E8EB',
  },
  dark: {
    background: '#151718',
    surface: '#1E2022',
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    primary: '#3DB8E8',
    border: '#2B2F31',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  title: 'text-2xl font-bold',
  subtitle: 'text-lg font-semibold',
  body: 'text-base',
  caption: 'text-sm',
} as const;
