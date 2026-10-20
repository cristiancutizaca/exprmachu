import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f7', 100: '#d5dfe8',
          400: '#3a5f85', 500: '#1c3a5c', 600: '#162e47',
        },
        sky: {
          brand: '#3b97c8', dark: '#2d7fad', light: '#7ec8e8',
          50: '#f0f8fd',
        },
        subbar: '#1e4d87',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        topbar: '0 2px 8px rgba(0,0,0,0.18)',
        modal:  '0 20px 60px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
export default config
