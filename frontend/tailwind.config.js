/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F17",
        cardBg: "#161C28",
        accentBlue: "#3B82F6",
        accentGreen: "#10B981",
        accentOrange: "#F59E0B",
      },
    },
  },
  plugins: [],
}