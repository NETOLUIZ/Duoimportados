/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        brand: {
          blue: '#2563EB',
          blueHover: '#1D4ED8',
          green: '#16A34A',
          greenHover: '#15803D',
          amber: '#F59E0B',
          amberHover: '#D97706',
          red: '#DC2626',
          redHover: '#B91C1C',
        },
        canvas: '#F8FAFC',
        textPrimary: '#1E293B',
      },
    },
  },
  plugins: [],
}
