/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  extends: ["@acme/eslint-config"], // uses the config in `packages/config/eslint`
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    tsconfigRootDir: __dirname,
    project: [
      "./tsconfig.json",
      "./apps/*/tsconfig.json",
      "./packages/*/tsconfig.json",
    ],
  },
  settings: {
    next: {
      rootDir: ["apps/nextjs"],
    },
  },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        name: "@mui/material",
        message:
          "Importing material component, probably by mistake. Please use @mui/joy instead.",
      },
      {
        name: "react-force-graph",
        message:
          "Breaks SSR. Ensure that you are dynamically importing this, or the importer is dynamically imported in all uses.",
      },
    ],
  },
};

module.exports = config;
