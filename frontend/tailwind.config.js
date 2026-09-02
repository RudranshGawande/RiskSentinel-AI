/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        card: '#18181b',
        'card-foreground': '#fafafa',
        primary: '#3b82f6',
        'primary-foreground': '#ffffff',
        secondary: '#27272a',
        'secondary-foreground': '#fafafa',
        muted: '#27272a',
        'muted-foreground': '#a1a1aa',
        accent: '#27272a',
        'accent-foreground': '#fafafa',
        destructive: '#ef4444',
        'destructive-foreground': '#fafafa',
        border: '#27272a',
        input: '#27272a',
        ring: '#3b82f6',
      },
    },
  },
  plugins: [],
}
