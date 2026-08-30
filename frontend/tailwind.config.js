/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        step1: '#7c5cff', step2: '#e08a2b', step3: '#2f7de1',
        step4: '#12a887', step5: '#d6428f', step6: '#0891b2', step7: '#e0442c',
      }
    },
  },
  plugins: [],
}
