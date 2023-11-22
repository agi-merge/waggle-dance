// env-sync.js
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { parse, stringify } from "yaml";

import { envSchema } from "../apps/nextjs/src/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.chdir(path.resolve(__dirname, ".."));

// Extract required server environment variables
const serverEnvVars = Object.keys(envSchema.server);

// Update docker-compose.yml
const dockerCompose = parse(fs.readFileSync("docker-compose.yml", "utf8"));
dockerCompose.services.app.environment = serverEnvVars;
fs.writeFileSync("docker-compose.yml", stringify(dockerCompose), "utf8");

// Update .env.example
fs.writeFileSync(".env.example", serverEnvVars.join("\n"), "utf8");

// Update turbo.json
const turbo = JSON.parse(fs.readFileSync("turbo.json", "utf8"));
turbo.globalEnv = serverEnvVars;
fs.writeFileSync("turbo.json", JSON.stringify(turbo, null, 2), "utf8");

// Update README.md
let readme = fs.readFileSync("README.md", "utf8");
readme = readme.replace(/(?<=&env=)[^&]*/, serverEnvVars.join(","));
fs.writeFileSync("README.md", readme, "utf8");
