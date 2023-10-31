// app/nextjs/src/constants.ts

import { env } from "@acme/env-config";

export const app = {
  name: "waggledance.ai",
  description: "Automate complex tasks with swarms of LLMs",
  version: env.NEXT_PUBLIC_APP_VERSION ?? "preview",
  localStorageKeys: {
    goal: "AGI:MERGE:GOAL:STORE",
    alerts: "AGI:MERGE:ALERTS:STORE",
    waggleDance: "AGI:MERGE:WAGGLE:DANCE:STORE",
  },
};
