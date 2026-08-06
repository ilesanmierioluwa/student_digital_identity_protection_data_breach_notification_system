/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dspz: {
          navy: '#0f2540',
          blue: '#1d4ed8',
          accent: '#f59e0b',
          danger: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};
