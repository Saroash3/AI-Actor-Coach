import type { Config } from "tailwindcss";

// "Backstage & Spotlight" theme
//   stage  — the dark theatre (backgrounds, surfaces)
//   spot   — spotlight gold (primary accent, calls to action)
//   velvet — curtain crimson (secondary accent, recording, emphasis)
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
        stage: {
          950: "#07060a",
          900: "#0c0a10",
          850: "#110e16",
          800: "#17131d",
          700: "#221c2a",
          600: "#2e2737",
          500: "#453c50",
        },
        spot: {
          50:  "#fdf8ec",
          100: "#faefd0",
          200: "#f6e0a3",
          300: "#f1cd72",
          400: "#ebb94a",
          500: "#dda032",
          600: "#bd7f24",
          700: "#955f1f",
          800: "#7a4c1f",
          900: "#663f1d",
        },
        velvet: {
          50:  "#fdf2f4",
          100: "#fbe5e9",
          200: "#f6ccd4",
          300: "#eea3b1",
          400: "#e46f86",
          500: "#d4435f",
          600: "#b82a47",
          700: "#9a1f3a",
          800: "#811d36",
          900: "#6e1b32",
          950: "#3d0a18",
        },
        bone: "#f4efe6",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "spotlight-in": {
          "0%":   { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%, -40%) scale(1)" },
        },
        "beam-spin": {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to:   { backgroundPosition: "-200% 0" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%": { opacity: "1" },
          "48%": { opacity: "0.72" },
          "50%": { opacity: "1" },
          "72%": { opacity: "0.9" },
        },
      },
      animation: {
        marquee: "marquee var(--duration) linear infinite",
        "spotlight-in": "spotlight-in 2s ease 0.75s 1 forwards",
        "beam-spin": "beam-spin var(--beam-duration, 6s) linear infinite",
        shimmer: "shimmer 6s linear infinite",
        flicker: "flicker 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
