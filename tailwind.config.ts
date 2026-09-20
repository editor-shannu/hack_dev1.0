import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#070a13',
        surface: {
          DEFAULT: '#0f172a',
          card: 'rgba(15, 23, 42, 0.75)',
          glass: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        cyber: {
          cyan: '#00f2fe',
          emerald: '#10b981',
          teal: '#14b8a6',
          violet: '#8b5cf6',
          indigo: '#6366f1',
          rose: '#f43f5e',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glass-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'laser-sweep': 'laserSweep 2.5s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        laserSweep: {
          '0%, 100%': { top: '0%' },
          '50%': { top: '100%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
