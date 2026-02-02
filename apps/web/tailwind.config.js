/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: '#fef7ec',
          100: '#fdecd3',
          200: '#fad6a5',
          300: '#f7ba6d',
          400: '#f39433',
          500: '#f0760f',  // Main brand color - warm orange
          600: '#d45a09',
          700: '#b0400b',
          800: '#8f3310',
          900: '#762c11',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e5fe',
          300: '#7cd2fd',
          400: '#36bcfa',
          500: '#0ca4eb',  // Secondary - vibrant blue
          600: '#0083c9',
          700: '#0168a3',
          800: '#065886',
          900: '#0b496f',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',  // Accent - purple
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
