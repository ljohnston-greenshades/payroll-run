import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gsNavy: "#062a47",
        gsGreen: "#85c441",
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        serif: ['"PT Serif"', "serif"],
        sans: ['"Source Sans 3"', '"Source Sans Pro"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
