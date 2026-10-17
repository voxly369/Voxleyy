/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#FF5A3C',
          50: '#FFF1EE',
          100: '#FFE0DA',
          200: '#FFC2B7',
          300: '#FF9C8A',
          400: '#FF7A61',
          500: '#FF5A3C',
          600: '#E8442A',
          700: '#C23520',
          800: '#9B2C1C',
          900: '#7A261A',
        },
        verified: '#8B5CF6',
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'ui-serif', 'serif'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } },
      animation: { shimmer: 'shimmer 1.4s infinite' },
    },
  },
  plugins: [],
}
