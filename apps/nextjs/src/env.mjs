import { createEnv } from "@t3-oss/env-nextjs";

import { envSchema } from "./env-schema.mjs";

export const env = createEnv(envSchema);
