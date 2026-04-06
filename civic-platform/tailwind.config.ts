import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          primary: "#2563EB", // Rich vibrant blue
          secondary: "#0D9488", // Deep teal
          accent: "#F59E0B",
          success: "#10B981", 
          danger: "#E11D48", // Rose danger
          background: "#F8FAFC",
          card: "#FFFFFF",
          text: "#0F172A",
          muted: "#64748B",
        },
      },
      boxShadow: {
        civic: "0 20px 40px -15px rgba(37, 99, 235, 0.15)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        "glass-hover": "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
