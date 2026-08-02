/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6eef8',
          100: '#c0d5ef',
          200: '#96b8e5',
          300: '#6c9bda',
          400: '#4d86d3',
          500: '#2e71cb',
          600: '#0058BC',
          700: '#004fa8',
          800: '#004494',
          900: '#003070',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
