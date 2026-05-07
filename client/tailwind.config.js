/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blind: "#1e1b4b",
        guide: "#0f172a",
        accent: "#f59e0b",
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
