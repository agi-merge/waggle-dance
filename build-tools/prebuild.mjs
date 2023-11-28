import path from 'path';
import { fileURLToPath } from 'url';
import { checkEnv } from "./check-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, ".."));

if (!!process.env.SKIP_ENV_VALIDATION) {
  console.log(YELLOW + "⚠️ Skipping env validation!" + RESET);
  process.exit(1);
}

// Fun message colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";

console.log(BLUE + "🏃‍♀️ Running prebuild script..." + RESET);

console.log("🕵️‍♀️ Checking envs...");
try {
  checkEnv();
  console.log(GREEN + "✅ Envs look all good!" + RESET);
} catch (error) {
  console.error(RED + "❌ Error:" + RESET, error);
  process.exit(1);
}

// Add more prebuild scripts here...

console.log(BLUE + "🏁 Done with prebuild steps!" + RESET);
