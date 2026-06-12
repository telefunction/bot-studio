import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#000000",
          900: "#090909",
          850: "#121212",
          800: "#1a1a1a",
          700: "#2b2b2b"
        },
        paper: {
          50: "#ffffff",
          100: "#f7f7f7",
          200: "#eeeeee",
          300: "#dedede"
        },
        signal: {
          blue: "#229ED9",
          cyan: "#3dd6c6",
          lime: "#a9e34b",
          amber: "#f5b84b",
          red: "#ff5d4f"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgb(0 0 0 / 0.10)",
        darkSoft: "0 18px 60px rgb(0 0 0 / 0.38)"
      },
      fontFamily: {
        sans: ["Lucida Grande", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
