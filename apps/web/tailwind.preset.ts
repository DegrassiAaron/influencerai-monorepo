import type { Config } from 'tailwindcss';

const brandColors = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
} as const satisfies Record<number, string>;

export const shadcnPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: brandColors,
      },
      boxShadow: {
        brand: '0 20px 45px -20px rgba(79, 70, 229, 0.55)',
      },
    },
  },
};
