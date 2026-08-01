/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        backgroundDark: '#151718',
        surface: '#F5F5F7',
        surfaceDark: '#1E2022',
        text: '#11181C',
        textDark: '#ECEDEE',
        textMuted: '#687076',
        textMutedDark: '#9BA1A6',
        primary: '#0A7EA4',
        primaryDark: '#3DB8E8',
        border: '#E6E8EB',
        borderDark: '#2B2F31',
      },
    },
  },
  plugins: [],
};
