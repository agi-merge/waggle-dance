import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fun message colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";

export const checkEnv = () => {
  // Load the contents of env.mjs and .env.example files
  const envMjsContent = fs.readFileSync(
    join(__dirname, "../apps/nextjs/src/", "env-schema.mjs"),
    "utf8",
  );
  const envExampleContent = fs.readFileSync(
    join(__dirname, "../", ".env.example"),
    "utf8",
  );

  // Extract the variable names from .env.example
  const envExampleVariables = envExampleContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]);
  console.log(
    `Found these env vars in ${YELLOW + ".env.example" + RESET}`,
    envExampleVariables,
  );

  // Extract the variable names from env.mjs's runtimeEnv object
  const runtimeEnvVariableNames = envMjsContent
    .match(/runtimeEnv:\s?{([\s\S]*?)}/)?.[1]
    .split("\n")
    .map((line) => line.trim().split(":")[0].trim())
    .filter((variable) => variable !== "}," && variable !== "");
  console.log(
    `Found these env vars in ${YELLOW + "env-schema.mjs" + RESET}`,
    runtimeEnvVariableNames,
  );

  // Check if all variables from .env.example are present in runtimeEnv
  const missingVariables = envExampleVariables.filter(
    (variable) => !runtimeEnvVariableNames.includes(variable),
  );

  // Throw an error if any variables are missing
  if (missingVariables.length > 0) {
    throw new Error(
      `The following variables are missing from env-schema.mjs's runtimeEnv object, please add them with appropriate zod types/constraints:\n${missingVariables.join(
        "\n",
      )}`,
    );
  } else {
    console.log("All variables from .env.example are present in runtimeEnv.");
  }
};
