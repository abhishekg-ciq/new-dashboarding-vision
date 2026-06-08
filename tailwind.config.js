/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ciq: {
          purple: "#210235",
          accent: "#C231FF",
          sky: "#5AAFFE",
          cobalt: "#1F22B2",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(33, 2, 53, 0.04), 0 1px 3px 0 rgba(33, 2, 53, 0.05)",
        ring: "0 0 0 3px rgba(194, 49, 255, 0.18)",
      },
    },
  },
  plugins: [],
};
