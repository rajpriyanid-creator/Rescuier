/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        disaster: {
          red: '#DC2626',
          orange: '#EA580C',
          yellow: '#D97706',
          green: '#16A34A',
          blue: '#2563EB',
          dark: '#0F172A',
          panel: '#1E293B',
          border: '#334155',
        },
      },
    },
  },
  plugins: [],
};
