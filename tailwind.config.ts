import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0E7C7B",
          dark: "#095352",
          light: "#51C4C4"
        },
        accent: "#F9A620"
      }
    }
  },
  plugins: []
};

export default config;
