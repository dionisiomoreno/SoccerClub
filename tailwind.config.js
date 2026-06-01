/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#121212',
          surface: '#1E1E1E',
          red: '#C00000',
          'red-hover': '#A00000',
          border: '#2A2A2A',
          muted: '#6B7280',
          text: '#F5F5F5'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
