/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#ececef",
          200: "#d4d4da",
          300: "#a9a9b2",
          400: "#76767f",
          500: "#4a4a52",
          600: "#2f2f36",
          700: "#1f1f24",
          800: "#141418",
          900: "#0b0b0e",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
