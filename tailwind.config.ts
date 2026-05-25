import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0B1220",
        wilmaBlue: "#0E4F8A",
        teal: "#0F8B8D",
        orange: "#FF4D1D",
        cream: "#F6F1E8",
        grayWilma: {
          100: "#F2EDE4",
          200: "#E0D9CE",
          300: "#C8BFB3",
          400: "#A09889",
          600: "#5C5550",
          800: "#2E2926"
        },
        danger: "#D63B1A",
        success: "#1A8A74"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Georgia", "Cambria", "Times New Roman", "serif"]
      },
      boxShadow: {
        soft: "0 18px 50px rgba(11, 18, 32, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
