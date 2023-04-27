// TODO: Add support for TS config files in Nativewind.

// import { type Config } from "tailwindcss";

// import baseConfig from "@acme/tailwind-config";

// export default {
//   presets: [baseConfig],
//   content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
// } satisfies Config;

const config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/tw-elements/dist/js/**/*.js",
  ],
};

module.exports = config;
