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
          400: '#466b8d', 500: '#0e3257', 600: '#082440',
        },
        sky: {
          brand: '#12649a', dark: '#0e507e', light: '#8cc6e2',
          50: '#f0f8fd',
        },
        subbar: '#134274', gold: { brand: '#f4b000', dark: '#d89a00', soft: '#fff5d9' },
      },
      boxShadow: {
        card:   '0 7px 24px rgba(11,49,83,.045), 0 1px 3px rgba(11,49,83,.06)',
        topbar: '0 2px 8px rgba(0,0,0,0.18)',
        modal:  '0 20px 60px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
export default config
