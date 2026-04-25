/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: {
          50: '#faf8f3',
          100: '#f6f4ef',
          200: '#efece5',
          300: '#e5e1d8',
          400: '#d4cfc2',
          500: '#b8b2a1',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          soft: '#4a4a4a',
          mute: '#8a8680',
        },
        accent: {
          DEFAULT: '#c4542c',
          soft: '#e88b6a',
          bg: '#faeee6',
        },
        signal: {
          ok: '#5a7a4f',
          warn: '#b8863a',
          danger: '#a04040',
        },
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(26,26,26,0.04), 0 0 0 1px #e5e1d8',
        'medium': '0 2px 8px rgba(26,26,26,0.06), 0 0 0 1px #e5e1d8',
        'floating': '0 12px 32px rgba(26,26,26,0.12), 0 0 0 1px #d4cfc2',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
