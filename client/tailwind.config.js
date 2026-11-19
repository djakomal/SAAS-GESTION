/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f3',
          100: '#d6ece1',
          200: '#b0d9c5',
          300: '#83bfa4',
          400: '#579d81',
          500: '#3c8067',
          600: '#2c6652',
          700: '#245244',
          800: '#1e4238',
          900: '#19372f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)',
      },
    },
  },
  plugins: [],
}
