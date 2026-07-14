import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        leaf: "#2f6f63",
        mint: "#d9eee7",
        coral: "#c75b4a",
        amber: "#d59c37"
      },
      boxShadow: {
        panel: "0 14px 40px rgba(23, 33, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
