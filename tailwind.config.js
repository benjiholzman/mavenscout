/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand cyan — logo dot + "Scout" wordmark half. Reserved for actions
        // and emphasis, not spread everywhere (design brief).
        brand: {
          50: '#EBF7F9',
          100: '#D2EDF1',
          200: '#A6DBE3',
          300: '#6FC2CF',
          400: '#38A5B7',
          500: '#0C8C9F',
          600: '#0A7385',
          700: '#095D6C',
          800: '#0A4B57',
          900: '#0B3E48',
        },
        // Warm-neutral surface + ink scale (editorial, not stark white).
        paper: '#FAF8F5',
        ink: {
          DEFAULT: '#22333B',
          soft: '#4A5B63',
          faint: '#7C8B92',
        },
        line: {
          DEFAULT: '#E7E2DA',
          soft: '#EFEBE4', // in-card rules and dividers
          strong: '#D9D2C6', // card bottom-bar divider
        },
        // Featured Member gold treatment (profiles-membership §2.2).
        gold: {
          300: '#E5C878',
          500: '#C9A227',
          700: '#9A7B1C',
          800: '#6E5714', // small gold text on white (AA contrast)
        },
      },
      fontFamily: {
        display: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(34,51,59,.06), 0 10px 28px -14px rgba(34,51,59,.24)',
        'card-hover': '0 2px 6px rgba(34,51,59,.1), 0 16px 34px -14px rgba(34,51,59,.32)',
        tooltip: '0 6px 16px -4px rgba(34,51,59,.35)',
      },
    },
  },
  plugins: [],
}
