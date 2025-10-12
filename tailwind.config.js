/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dungeon: {
          bg: '#0f1115',
          surface: '#1d2330',
          border: '#2a2f3a',
          accent: '#273043',
          'accent-active': '#324667',
          text: '#c8d1e0',
        }
      }
    },
  },
  plugins: [],
}
