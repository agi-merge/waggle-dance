import type { Config } from "tailwindcss";

import baseConfig from "@acme/tailwind-config";

export default {
  content: ["./src/**/*.tsx", "./node_modules/tw-elements/dist/js/**/*.js"],
  presets: [baseConfig],
  darkMode: "class",
  plugins: [require("tw-elements/dist/plugin.cjs")],
  theme: {
    extend: {},
  },
} satisfies Config;
