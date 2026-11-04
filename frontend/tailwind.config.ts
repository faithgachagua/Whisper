import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F2FF', 100: '#ECE6FF', 200: '#D9CEFF', 300: '#BDA9FF', 400: '#9B7CF7',
          500: '#7C56E8', 600: '#5F37D1', 700: '#4C2AB0', 800: '#3A2088', 900: '#2A1768', 950: '#1B0F47',
        },
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        rose: { whisper: '#E8497A' },
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '1.25rem' },
      boxShadow: { card: '0 1px 2px rgba(42,23,104,.06), 0 8px 24px -12px rgba(42,23,104,.18)' },
    },
  },
  plugins: [],
};
export default config;
