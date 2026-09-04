import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          top: '#0a0a0c',
          bottom: '#121218',
        },
        surface: 'rgba(255, 255, 255, 0.06)',
        'surface-strong': 'rgba(255, 255, 255, 0.12)',
        'surface-soft': 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.1)',
        'border-strong': 'rgba(255, 255, 255, 0.24)',
        accent: '#8b7cf7',
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171',
        info: '#60a5fa',
        textPrimary: '#f2f3f7',
        textSecondary: 'rgba(242, 243, 247, 0.64)',
        textTertiary: 'rgba(242, 243, 247, 0.38)',
        onAccent: '#ffffff',
      },
      borderRadius: {
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '28px',
      },
    },
  },
  plugins: [],
};

export default config;
