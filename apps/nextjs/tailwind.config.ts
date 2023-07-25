import baseConfig from "@acme/tailwind-config";
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.tsx"],
  presets: [baseConfig],
} satisfies Config;
