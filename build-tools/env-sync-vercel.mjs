// env-sync-vercel.mjs
// this script is used to push local env vars to Vercel.

import { execSync } from 'child_process';
import fs from 'fs';
import { exit } from 'process';

// Check if a mode was provided
const mode = process.argv[2];
if (!mode) {
  console.error("No mode provided. Usage: node env-sync-vercel.mjs <push | clean> <environment>");
  exit(1);
}

// Check if the mode is valid
if (!["push", "clean"].includes(mode)) {
  console.error("Invalid mode. It must be one of: push, clean.");
  exit(1);
}

// Check if an environment was provided
const environment = process.argv[3];
if (!environment) {
  console.error("No environment provided. Usage: node env-sync-vercel.mjs <mode> <production | preview | development>");
  exit(1);
}

// Check if the environment is valid
if (!["production", "preview", "development"].includes(environment)) {
  console.error("Invalid environment. It must be one of: production, preview, development.");
  exit(1);
}

if (mode === "push") {
  await pushEnvVars();
} else if (mode === "clean") {
  cleanEnvVars();
}

async function pushEnvVars() {
  // Import the envSchema only when needed
  const { envSchema } = await import('../apps/nextjs/src/env-schema.mjs');

  // Validate the environment variables
  try {
    const { checkEnv } = await import('../build-tools/check-env.mjs');
    checkEnv();
  } catch (error) {
    console.error(error.message);
    exit(1);
  }

  // Get the environment file path from the command line arguments
  const envFilePath = process.argv[4] || '.env';

  // Read each line in the env file
  const lines = fs.readFileSync(envFilePath, 'utf8').split('\n');
  for (const line of lines) {
    // Split the line into name and value
    const parts = line.split('=');

    // Check if the variable is in the envSchema
    if (!Object.keys(envSchema.runtimeEnv).includes(parts[0])) {
      continue; // skip this iteration if the variable is not in the envSchema
    }

    // Add the variable to Vercel
    try {
      const value = JSON.stringify(parts[1]);
      const output = execSync(`echo ${value} | vercel env add ${parts[0]} ${environment}`);
      console.log(`Output: ${output}`);
    } catch (error) {
      console.error(`exec error: ${error}`);
    }
  }
}

function cleanEnvVars() {
  const output = execSync(`vercel env ls ${environment}`, { encoding: 'utf8' });

  // Parse the output to get the variable names
  const lines = output.split('\n');
  const varLines = lines.slice(3, lines.length - 1); // Skip the header and footer lines

  const varNames = varLines.map(line => {
    // This regular expression matches any number of whitespace characters at the start of the line (^\s*), followed by one or more non-whitespace characters (\S+).
    // The parentheses create a capture group, so the match method returns an array where the second element is the first word on the line.
    const match = line.match(/^\s*(\S+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

    // Remove each variable
  for (const varName of varNames) {
    try {
      execSync(`vercel env rm ${varName} ${environment} -y`);
      console.log(`Removed variable: ${varName}`);
    } catch (error) {
      console.error(`exec error for ${varName}: ${error}`);
    }
  }
}


/*

Vercel CLI 32.5.5

  ▲ vercel env [command] [options]

  Interact with environment variables.

  Commands:

  ls                        List all variables for the specified Environment
  add   name [environment]  Add an Environment Variable (see examples below)
  rm    name [environment]  Remove an Environment Variable (see examples below)
  pull  [filename]          Pull all Development Environment Variables from the cloud and write to a file [.env.local]


  Options:

       --environment  Set the Environment (development, preview, production) when pulling Environment Variables
       --git-branch   Specify the Git branch to pull specific Environment Variables for
  -y,  --yes          Skip the confirmation prompt when removing an alias


  Global Options:

       --cwd <DIR>            Sets the current working directory for a single run of a command
  -d,  --debug                Debug mode (default off)
  -Q,  --global-config <DIR>  Path to the global `.vercel` directory
  -h,  --help                 Output usage information
  -A,  --local-config <FILE>  Path to the local `vercel.json` file
       --no-color             No color mode (default off)
  -S,  --scope                Set a custom scope
  -t,  --token <TOKEN>        Login token
  -v,  --version              Output the version number


  Examples:

  - Pull all Development Environment Variables down from the cloud

    $ vercel env pull <file>
    $ vercel env pull .env.development.local

  - Add a new variable to multiple Environments

    $ vercel env add <name>
    $ vercel env add API_TOKEN

  - Add a new variable for a specific Environment

    $ vercel env add <name> <production | preview | development>
    $ vercel env add DB_PASS production

  - Add a new variable for a specific Environment and Git Branch

    $ vercel env add <name> <production | preview | development> <gitbranch>
    $ vercel env add DB_PASS preview feat1

  - Add a new Environment Variable from stdin

    $ cat <file> | vercel env add <name> <production | preview | development>
    $ cat ~/.npmrc | vercel env add NPM_RC preview
    $ vercel env add API_URL production < url.txt

  - Remove a variable from multiple Environments

    $ vercel env rm <name>
    $ vercel env rm API_TOKEN

  - Remove a variable from a specific Environment

    $ vercel env rm <name> <production | preview | development>
    $ vercel env rm NPM_RC preview

  - Remove a variable from a specific Environment and Git Branch

    $ vercel env rm <name> <production | preview | development> <gitbranch>
    $ vercel env rm NPM_RC preview feat1
  */