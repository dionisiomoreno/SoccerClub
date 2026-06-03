/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#f3f3f4',
          surface: '#ffffff',
          primary: '#1ab394',
          'primary-hover': '#18a689',
          border: '#e7eaec',
          muted: '#999999',
          text: '#676a6c',
          navy: '#2f4050',
          'navy-light': '#3d4f60',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        nav: '0 2px 4px rgba(0,0,0,0.06)'
      }
    }
  },
  plugins: []
}
