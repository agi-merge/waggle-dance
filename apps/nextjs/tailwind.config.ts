import type { Config } from "tailwindcss";

import baseConfig from "@acme/tailwind-config";

export default {
  darkMode: "class",
  content: ["./src/**/*.tsx"],
  presets: [baseConfig],
} satisfies Config;
