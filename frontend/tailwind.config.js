/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      colors: {
        primary: "#1D3557",
        accent: "#E9C46A",
        background: "#F8F9FA",
        neutral: "#2B2D42",
        success: "#2A9D8F",
        error: "#E63946",
      }
    }
  },
  plugins: [],
};
