import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf4",
          100: "#d6f8e2",
          200: "#b0efc9",
          300: "#7ce1a9",
          400: "#45cb85",
          500: "#20b26a",
          600: "#148f55",
          700: "#127248",
          800: "#125a3b",
          900: "#104a32",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
