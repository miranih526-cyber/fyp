/** @type {import('tailwindcss').Config} */
export default {
  // Prefer `selector` over legacy `class` so `html.dark` itself matches (not only `.dark *` descendants).
  darkMode: ["selector", ".dark"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
