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
        mint: '#2DD4BF',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        rose: { whisper: '#E8497A' },
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        drift: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(40px,-30px) scale(1.12)' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(28px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        gradientShift: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        heartbeat: { '0%,100%': { transform: 'scale(1)' }, '14%': { transform: 'scale(1.14)' }, '28%': { transform: 'scale(1)' }, '42%': { transform: 'scale(1.1)' } },
        shimmer: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(100%)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite', drift: 'drift 18s ease-in-out infinite', 'fade-up': 'fadeUp .7s ease-out both',
        'slide-in': 'slideIn .8s ease-out .2s both', gradient: 'gradientShift 16s ease infinite', heartbeat: 'heartbeat 2.6s ease-in-out infinite',
        shimmer: 'shimmer 1.2s ease-out',
      },
      borderRadius: { card: '1.25rem' },
      boxShadow: { card: '0 1px 2px rgba(42,23,104,.06), 0 8px 24px -12px rgba(42,23,104,.18)' },
    },
  },
  plugins: [],
};
export default config;
